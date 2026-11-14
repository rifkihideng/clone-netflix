// Vercel Function (satu entry point untuk semua /api/*).
// Subpath diteruskan lewat query param `path` oleh rewrite di vercel.json
// ("/api/:path*" -> "/api"), lalu dirutekan di sini.
import { createClient } from '@libsql/client'
import {
  ensureSchema,
  normalizeMovie,
  sanitizeDeviceId,
  upsertDevice,
  upsertMovie,
  upsertUser,
  createSession,
  getSessionUser,
  deleteSession,
  ensureDefaultProfile,
  listProfiles,
  insertProfile,
  removeProfile,
  sanitizeProfileName,
  sanitizeProfileColor,
  DEFAULT_PROFILE_ID,
  MOVIE_COLUMNS,
  WATCH_COLUMNS,
} from '../server/schema.js'
import {
  SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  appUrl,
  isSecureCookie,
  randomToken,
  sessionMaxAgeSeconds,
  oauthStateMaxAgeSeconds,
  buildCookie,
  parseCookies,
  exchangeCodeForToken,
  fetchGithubUser,
  githubAuthorizeUrl,
} from '../server/auth.js'

const TMDB_BASE = 'https://api.themoviedb.org/3'

// Endpoint TMDB yang diizinkan (sama dengan yang dipakai frontend).
const TMDB_PATH_ALLOWLIST = [
  /^\/trending\//,
  /^\/movie\/top_rated$/,
  /^\/discover\/movie$/,
  /^\/search\/multi$/,
  /^\/movie\/\d+$/,
  /^\/tv\/\d+$/,
  /^\/movie\/\d+\/(videos|credits)$/,
  /^\/tv\/\d+\/(videos|credits)$/,
]

function isPathAllowed(pathname) {
  return TMDB_PATH_ALLOWLIST.some((pattern) => pattern.test(pathname))
}

// Security headers untuk setiap respons API (mengurangi risiko clickjacking,
// sniffing MIME, dll).
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// CORS ketat: default tolak lintas-origin. Origin tambahan bisa diizinkan
// lewat env ALLOWED_ORIGINS (dipisah koma).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function isAllowedOrigin(origin, host) {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

// --- Rate limiting (anti-DoS, paritas dengan server/index.js) ---
// Nilai bisa disesuaikan lewat env. Limit terpisah untuk aksi tulis
// (POST/DELETE) karena operasi tersebut menyentuh database.
const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000
const RATE_MAX = Number(process.env.RATE_LIMIT_MAX) || 120
const WRITE_RATE_MAX = Number(process.env.RATE_LIMIT_WRITE_MAX) || 30

// State in-memory bersifat per-instance di serverless (tidak dibagi antar
// instance & hilang saat cold start). Untuk produksi skala besar gunakan store
// bersama (mis. Upstash/Vercel KV); ini proteksi dasar agar paritas dengan
// server/index.js yang juga memakai store in-memory.
const RATE_BUCKET_MAX = 10000
const generalBuckets = new Map() // ip -> { count, resetAt }
const writeBuckets = new Map() // ip -> { count, resetAt }

function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  const first = forwarded ? forwarded.split(',')[0].trim() : ''
  return first && first.length <= 64 ? first : 'unknown'
}

function pruneBuckets(buckets, now) {
  for (const [ip, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(ip)
  }
}

// Catat satu request dalam jendela fixed-window; kembalikan info limit.
function takeRateLimit(buckets, ip, windowMs, limit, now) {
  let bucket = buckets.get(ip)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs }
    buckets.set(ip, bucket)
  }
  if (buckets.size > RATE_BUCKET_MAX) pruneBuckets(buckets, now)
  bucket.count += 1
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  }
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS, ...extraHeaders },
  })
}

// Batas ukuran body JSON, sama dengan express.json({ limit: '100kb' }) di
// server/index.js. Melindungi dari payload raksasa (DoS) pada aksi tulis.
const MAX_BODY_BYTES = 100 * 1024

// Baca & validasi body JSON dengan batas ukuran. Mengembalikan
// { data } bila berhasil, atau { error, status } bila ditolak.
async function readJsonBody(request, maxBytes = MAX_BODY_BYTES) {
  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { error: 'Payload terlalu besar.', status: 413 }
  }

  const text = await request.text().catch(() => null)
  if (text == null) {
    return { error: 'Body tidak dapat dibaca.', status: 400 }
  }
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { error: 'Payload terlalu besar.', status: 413 }
  }
  if (!text.trim()) {
    // Pertahankan perilaku lama: body kosong dianggap tidak ada data.
    return { data: {} }
  }
  try {
    return { data: JSON.parse(text) }
  } catch {
    return { error: 'Body JSON tidak valid.', status: 400 }
  }
}

function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  return url ? createClient({ url, authToken: token }) : null
}

// --- Login GitHub (OAuth): helper khusus Vercel Function ---

const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

function githubConfigured() {
  return Boolean(githubClientId && githubClientSecret)
}

function redirect(url, extraHeaders = {}) {
  return new Response(null, {
    status: 302,
    headers: { Location: url, ...SECURITY_HEADERS, ...extraHeaders },
  })
}

function sessionToken(request) {
  return parseCookies(request.headers.get('cookie'))[SESSION_COOKIE] ?? null
}

// Ambil pengguna dari sesi cookie, atau null bila belum/tidak valid.
async function getAuthUser(db, request) {
  if (!db) return null
  try {
    return await getSessionUser(db, sessionToken(request))
  } catch {
    return null
  }
}

// Kunci kepemilikan data: github_id + profil aktif (header X-Profile-Id),
// supaya Daftar Saya & riwayat terpisah per profil.
function getOwnerKey(user, request) {
  const profileId = sanitizeDeviceId(request.headers.get('x-profile-id') ?? '')
  return profileId ? `${user.github_id}:${profileId}` : null
}

// Ambil subpath API. Prioritas: query param `path` (hasil rewrite), lalu pathname.
function resolveApiPath(url) {
  const fromQuery = url.searchParams.get('path')
  if (fromQuery != null && fromQuery !== '') return fromQuery
  if (url.pathname.startsWith('/api/')) return url.pathname.slice('/api/'.length)
  return ''
}

// Proxy permintaan /api/tmdb/* ke TMDB. API key hanya ada di sisi server.
async function handleTmdb(url, tmdbPath) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return json({ error: 'TMDB_API_KEY belum diisi di server.' }, 500)
  }

  if (!isPathAllowed(tmdbPath)) {
    return json({ error: 'Endpoint TMDB tidak diizinkan.' }, 404)
  }

  const query = new URLSearchParams(url.search)
  query.delete('path') // buang param sintetis dari rewrite
  query.set('api_key', apiKey)
  if (!query.has('language')) query.set('language', 'id-ID')

  try {
    const upstream = await fetch(`${TMDB_BASE}${tmdbPath}?${query.toString()}`)
    const body = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': contentType, ...SECURITY_HEADERS },
    })
  } catch {
    return json({ error: 'Gagal terhubung ke server TMDB.' }, 502)
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url, 'http://localhost')
    const apiPath = resolveApiPath(url)

    // --- CORS ketat: tolak lintas-origin (kecuali yang diizinkan) ---
    const origin = request.headers.get('origin')
    if (origin && !isAllowedOrigin(origin, url.host)) {
      return json({ error: 'Origin tidak diizinkan (CORS).' }, 403)
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...SECURITY_HEADERS,
          'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          ...(origin
            ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' }
            : {}),
        },
      })
    }

    // --- Rate limiting ---
    // Diterapkan setelah CORS/OPTIONS supaya preflight & penolakan origin tidak
    // ikut dihitung (sama seperti urutan middleware di server/index.js).
    const now = Date.now()
    const ip = clientIp(request)
    const general = takeRateLimit(generalBuckets, ip, RATE_WINDOW_MS, RATE_MAX, now)
    if (!general.allowed) {
      return json(
        { error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' },
        429,
        {
          'X-RateLimit-Limit': String(RATE_MAX),
          'X-RateLimit-Remaining': String(general.remaining),
          'X-RateLimit-Reset': String(Math.ceil(general.resetAt / 1000)),
          'Retry-After': String(Math.max(1, Math.ceil((general.resetAt - now) / 1000))),
        },
      )
    }

    const isWrite = request.method === 'POST' || request.method === 'DELETE'
    if (isWrite) {
      const write = takeRateLimit(writeBuckets, ip, RATE_WINDOW_MS, WRITE_RATE_MAX, now)
      if (!write.allowed) {
        return json(
          { error: 'Terlalu banyak aksi tulis. Coba lagi sebentar lagi.' },
          429,
          {
            'X-RateLimit-Limit': String(WRITE_RATE_MAX),
            'X-RateLimit-Remaining': String(write.remaining),
            'X-RateLimit-Reset': String(Math.ceil(write.resetAt / 1000)),
            'Retry-After': String(Math.max(1, Math.ceil((write.resetAt - now) / 1000))),
          },
        )
      }
    }

    // --- Login GitHub (OAuth) ---
    if (apiPath === 'auth/login') {
      if (!githubConfigured()) {
        return json(
          {
            error:
              'Login GitHub belum dikonfigurasi. Isi GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET di .env.',
          },
          503,
        )
      }

      // State anti-CSRF disimpan di cookie httpOnly lalu dibandingkan saat callback.
      const state = randomToken(16)
      const stateCookie = buildCookie(OAUTH_STATE_COOKIE, state, {
        maxAge: oauthStateMaxAgeSeconds(),
        secure: isSecureCookie(),
      })
      return redirect(githubAuthorizeUrl(state), { 'Set-Cookie': stateCookie })
    }

    if (apiPath === 'auth/callback') {
      if (!githubConfigured()) {
        return json({ error: 'Login GitHub belum dikonfigurasi.' }, 503)
      }
      const db = getDbClient()
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)

      const clearStateCookie = buildCookie(OAUTH_STATE_COOKIE, '', {
        maxAge: 0,
        secure: isSecureCookie(),
      })
      const stateCookie = parseCookies(request.headers.get('cookie'))[OAUTH_STATE_COOKIE] ?? ''
      const state = url.searchParams.get('state')
      const code = url.searchParams.get('code')

      const errorResponse = (message, status) =>
        new Response(message, {
          status,
          headers: { ...SECURITY_HEADERS, 'Set-Cookie': clearStateCookie },
        })

      if (!state || state !== stateCookie) {
        return errorResponse('State tidak cocok (kemungkinan serangan CSRF).', 400)
      }
      if (!code) {
        return errorResponse('Kode OAuth tidak ditemukan.', 400)
      }

      try {
        const accessToken = await exchangeCodeForToken({
          code,
          clientId: githubClientId,
          clientSecret: githubClientSecret,
        })
        if (!accessToken) {
          return errorResponse('Gagal menukar kode OAuth dengan token.', 400)
        }

        const ghUser = await fetchGithubUser(accessToken)
        if (!ghUser || !ghUser.id) {
          return errorResponse('Gagal mengambil profil GitHub.', 401)
        }

        await ensureSchema(db)
        await upsertUser(db, ghUser)

        const token = randomToken(32)
        const maxAge = sessionMaxAgeSeconds()
        await createSession(db, token, ghUser.id, Date.now() + maxAge * 1000)

        const headers = new Headers({ Location: appUrl(), ...SECURITY_HEADERS })
        headers.append('Set-Cookie', clearStateCookie)
        headers.append(
          'Set-Cookie',
          buildCookie(SESSION_COOKIE, token, { maxAge, secure: isSecureCookie() }),
        )
        return new Response(null, { status: 302, headers })
      } catch {
        return errorResponse('Terjadi kesalahan saat login. Coba lagi.', 500)
      }
    }

    if (apiPath === 'auth/me') {
      const db = getDbClient()
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
      await ensureSchema(db)
      const user = await getAuthUser(db, request)
      if (!user) return json({ error: 'Login diperlukan.' }, 401)
      return json({ user })
    }

    if (apiPath === 'auth/logout') {
      const db = getDbClient()
      if (db) {
        try {
          await deleteSession(db, sessionToken(request))
        } catch {
          // Penghapusan sesi di DB gagal — cookie tetap dibersihkan.
        }
      }
      const clearCookie = buildCookie(SESSION_COOKIE, '', {
        maxAge: 0,
        secure: isSecureCookie(),
      })
      return json({ ok: true }, 200, { 'Set-Cookie': clearCookie })
    }

    // --- Proxy TMDB ---
    if (apiPath === 'tmdb' || apiPath.startsWith('tmdb/')) {
      // apiPath mis. "tmdb/trending/all/week" -> "/trending/all/week"
      const tmdbPath = apiPath.slice('tmdb'.length)
      return handleTmdb(url, tmdbPath)
    }

    const db = getDbClient()

    // --- Profil ("Siapa yang menonton?") ---
    if (apiPath === 'profiles') {
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
      await ensureSchema(db)
      const user = await getAuthUser(db, request)
      if (!user) return json({ error: 'Login diperlukan.' }, 401)

      if (request.method === 'GET') {
        try {
          await ensureDefaultProfile(db, user)
          return json(await listProfiles(db, user.github_id))
        } catch {
          return json({ error: 'Gagal membaca profil.' }, 500)
        }
      }

      if (request.method === 'POST') {
        const bodyResult = await readJsonBody(request)
        if (bodyResult.error) return json({ error: bodyResult.error }, bodyResult.status)
        const name = sanitizeProfileName(bodyResult.data.name)
        if (!name) return json({ error: 'Nama profil tidak valid.' }, 400)
        const color = sanitizeProfileColor(bodyResult.data.color)
        try {
          const profile = await insertProfile(db, user.github_id, { name, color })
          return json(profile, 201)
        } catch {
          return json({ error: 'Gagal menambah profil.' }, 500)
        }
      }

      return json({ error: 'Metode tidak diizinkan.' }, 405)
    }

    const profileDelete = apiPath.match(/^profiles\/([A-Za-z0-9_-]+)$/)
    if (profileDelete && request.method === 'DELETE') {
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
      await ensureSchema(db)
      const user = await getAuthUser(db, request)
      if (!user) return json({ error: 'Login diperlukan.' }, 401)
      const profileId = sanitizeDeviceId(profileDelete[1])
      if (!profileId || profileId === DEFAULT_PROFILE_ID) {
        return json({ error: 'Profil ini tidak dapat dihapus.' }, 400)
      }
      try {
        const removed = await removeProfile(db, user.github_id, profileId)
        if (!removed) return json({ error: 'Profil tidak ditemukan.' }, 404)
        return json({ ok: true })
      } catch {
        return json({ error: 'Gagal menghapus profil.' }, 500)
      }
    }

    // --- Daftar Saya (My List) ---
    if (apiPath === 'my-list') {
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
      await ensureSchema(db)
      const user = await getAuthUser(db, request)
      if (!user) return json({ error: 'Login diperlukan.' }, 401)
      const ownerKey = getOwnerKey(user, request)
      if (!ownerKey) return json({ error: 'Profil tidak valid.' }, 400)

      if (request.method === 'GET') {
        try {
          const result = await db.execute({
            sql: `SELECT ${MOVIE_COLUMNS}
                  FROM my_list l
                  JOIN movies m ON m.movie_id = l.movie_id
                  WHERE l.device_id = ?
                  ORDER BY l.added_at DESC`,
            args: [ownerKey],
          })
          return json(result.rows)
        } catch {
          return json({ error: 'Gagal membaca Daftar Saya.' }, 500)
        }
      }

      if (request.method === 'POST') {
        const bodyResult = await readJsonBody(request)
        if (bodyResult.error) return json({ error: bodyResult.error }, bodyResult.status)
        const body = bodyResult.data
        const movie = normalizeMovie(body.movie)
        if (!movie) return json({ error: 'Data film tidak valid.' }, 400)
        try {
          await upsertDevice(db, ownerKey)
          await upsertMovie(db, movie)
          await db.execute({
            sql: `INSERT INTO my_list (device_id, movie_id, added_at) VALUES (?, ?, ?)
                  ON CONFLICT (device_id, movie_id) DO NOTHING`,
            args: [ownerKey, movie.id, Date.now()],
          })
          return json({ ok: true }, 201)
        } catch {
          return json({ error: 'Gagal menambah ke Daftar Saya.' }, 500)
        }
      }

      return json({ error: 'Metode tidak diizinkan.' }, 405)
    }

    const myListDelete = apiPath.match(/^my-list\/(\d+)$/)
    if (myListDelete && request.method === 'DELETE') {
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
      await ensureSchema(db)
      const user = await getAuthUser(db, request)
      if (!user) return json({ error: 'Login diperlukan.' }, 401)
      const ownerKey = getOwnerKey(user, request)
      if (!ownerKey) return json({ error: 'Profil tidak valid.' }, 400)
      const movieId = Number(myListDelete[1])
      if (!Number.isSafeInteger(movieId) || movieId <= 0) {
        return json({ error: 'ID film tidak valid.' }, 400)
      }
      try {
        await db.execute({
          sql: 'DELETE FROM my_list WHERE device_id = ? AND movie_id = ?',
          args: [ownerKey, movieId],
        })
        return json({ ok: true })
      } catch {
        return json({ error: 'Gagal menghapus dari Daftar Saya.' }, 500)
      }
    }

    // --- Riwayat tontonan (Watch History) ---
    if (apiPath === 'watch-history') {
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
      await ensureSchema(db)
      const user = await getAuthUser(db, request)
      if (!user) return json({ error: 'Login diperlukan.' }, 401)
      const ownerKey = getOwnerKey(user, request)
      if (!ownerKey) return json({ error: 'Profil tidak valid.' }, 400)

      if (request.method === 'GET') {
        try {
          const result = await db.execute({
            sql: `SELECT ${WATCH_COLUMNS}
                  FROM watch_history l
                  JOIN movies m ON m.movie_id = l.movie_id
                  WHERE l.device_id = ?
                  ORDER BY l.watched_at DESC`,
            args: [ownerKey],
          })
          return json(result.rows)
        } catch {
          return json({ error: 'Gagal membaca riwayat tontonan.' }, 500)
        }
      }

      if (request.method === 'POST') {
        const bodyResult = await readJsonBody(request)
        if (bodyResult.error) return json({ error: bodyResult.error }, bodyResult.status)
        const body = bodyResult.data
        const movie = normalizeMovie(body.movie)
        if (!movie) return json({ error: 'Data film tidak valid.' }, 400)

        const finiteNonNegative = (value) => {
          const n = Number(value)
          return Number.isFinite(n) && n > 0 ? n : 0
        }
        let progressSeconds = finiteNonNegative(body.progress_seconds)
        let duration = finiteNonNegative(body.duration)
        if (duration > 0 && progressSeconds > duration) progressSeconds = duration

        try {
          await upsertDevice(db, ownerKey)
          await upsertMovie(db, movie)
          await db.execute({
            sql: `INSERT INTO watch_history
                    (device_id, movie_id, watched_at, progress_seconds, duration)
                  VALUES (?, ?, ?, ?, ?)
                  ON CONFLICT (device_id, movie_id) DO UPDATE SET
                    watched_at = excluded.watched_at,
                    progress_seconds = excluded.progress_seconds,
                    duration = excluded.duration`,
            args: [ownerKey, movie.id, Date.now(), progressSeconds, duration],
          })
          return json({ ok: true }, 201)
        } catch {
          return json({ error: 'Gagal mencatat riwayat tontonan.' }, 500)
        }
      }

      return json({ error: 'Metode tidak diizinkan.' }, 405)
    }

    const historyDelete = apiPath.match(/^watch-history\/(\d+)$/)
    if (historyDelete && request.method === 'DELETE') {
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
      await ensureSchema(db)
      const user = await getAuthUser(db, request)
      if (!user) return json({ error: 'Login diperlukan.' }, 401)
      const ownerKey = getOwnerKey(user, request)
      if (!ownerKey) return json({ error: 'Profil tidak valid.' }, 400)
      const movieId = Number(historyDelete[1])
      if (!Number.isSafeInteger(movieId) || movieId <= 0) {
        return json({ error: 'ID film tidak valid.' }, 400)
      }
      try {
        await db.execute({
          sql: 'DELETE FROM watch_history WHERE device_id = ? AND movie_id = ?',
          args: [ownerKey, movieId],
        })
        return json({ ok: true })
      } catch {
        return json({ error: 'Gagal menghapus riwayat tontonan.' }, 500)
      }
    }

    return json({ error: 'Tidak ditemukan.' }, 404)
  },
}
