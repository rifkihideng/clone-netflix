import express from 'express'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'
import {
  ensureSchema,
  normalizeMovie,
  upsertDevice,
  upsertMovie,
  upsertUser,
  createSession,
  getSessionUser,
  deleteSession,
  MOVIE_COLUMNS,
  WATCH_COLUMNS,
} from './schema.js'
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
} from './auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY = process.env.TMDB_API_KEY
const PORT = process.env.PORT || 4000

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))

// --- Security headers (Helmet) ---
// CSP disesuaikan dengan kebutuhan aplikasi: gambar TMDB, iframe YouTube,
// dan inline style (background-image banner). Script hanya dari 'self'.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://image.tmdb.org'],
        frameSrc: ['https://www.youtube.com'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
  }),
)

// --- CORS ketat (default: tolak lintas-origin) ---
// Aplikasi bersifat same-origin (frontend & API satu domain), jadi CORS
// ditutup secara default. Origin tambahan bisa diizinkan lewat env
// ALLOWED_ORIGINS (dipisah koma) bila kelak ada frontend terpisah.
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

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && !isAllowedOrigin(origin, req.headers.host)) {
    return res.status(403).json({ error: 'Origin tidak diizinkan (CORS).' })
  }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.sendStatus(204)
  }
  next()
})

const TURSO_URL = process.env.TURSO_DATABASE_URL
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN

// Klien database Turso (libSQL). `null` bila belum dikonfigurasi di .env.
const db = TURSO_URL ? createClient({ url: TURSO_URL, authToken: TURSO_TOKEN }) : null

function requireDb(req, res, next) {
  if (!db) {
    return res.status(503).json({
      error:
        'Database Turso belum dikonfigurasi. Isi TURSO_DATABASE_URL & TURSO_AUTH_TOKEN di .env lalu jalankan ulang server.',
    })
  }
  next()
}

function sessionToken(req) {
  return parseCookies(req.headers.cookie)[SESSION_COOKIE] ?? null
}

// Middleware otentikasi: wajib punya sesi login yang masih berlaku.
// Identitas pengguna disimpan di req.user, dan kunci kepemilikan data
// (id GitHub) di req.ownerKey.
async function requireAuth(req, res, next) {
  try {
    const user = await getSessionUser(db, sessionToken(req))
    if (!user) {
      return res.status(401).json({ error: 'Login diperlukan.' })
    }
    req.user = user
    req.ownerKey = String(user.github_id)
    next()
  } catch {
    res.status(500).json({ error: 'Gagal memverifikasi sesi.' })
  }
}

// Kolom film & riwayat dikembalikan lewat relasi JOIN ke tabel `movies`
// (lihat server/schema.js). Alias `id` tetap dipakai agar kontrak API sama.

// --- Cache & proteksi untuk proxy TMDB ---

// Cache in-memory untuk response TMDB (GET 200 saja). Mengurangi jumlah
// request ke TMDB ketika banyak pengguna membuka halaman yang sama.
// Dibatasi jumlahnya supaya tidak tumbuh tanpa batas (anti memory-exhaustion).
const TMDB_CACHE_TTL = 10 * 60 * 1000 // 10 menit
const TMDB_CACHE_MAX = 500
const tmdbCache = new Map()

function cacheTmdb(key, entry) {
  if (tmdbCache.size >= TMDB_CACHE_MAX) {
    const oldest = tmdbCache.keys().next().value
    if (oldest !== undefined) tmdbCache.delete(oldest)
  }
  tmdbCache.set(key, entry)
}

// --- Rate limiting (anti-DoS) ---
// Nilai bisa disesuaikan lewat env. Limit terpisah untuk aksi tulis (POST/DELETE)
// karena operasi tersebut menyentuh database.
const RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000
const RATE_MAX = Number(process.env.RATE_LIMIT_MAX) || 120
const WRITE_RATE_MAX = Number(process.env.RATE_LIMIT_WRITE_MAX) || 30

const apiLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  limit: RATE_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' },
})

const writeLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  limit: WRITE_RATE_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak aksi tulis. Coba lagi sebentar lagi.' },
})

// Bila berjalan di belakang reverse proxy, aktifkan lewat env TRUST_PROXY=1
// agar `req.ip` tidak dianggap IP proxy untuk semua pengguna.
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)

app.use('/api', apiLimiter)

// Hanya izinkan endpoint TMDB yang memang dipakai aplikasi, supaya proxy
// tidak bisa dipakai untuk menembak endpoint TMDB lain secara bebas.
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

// Proxy semua request /api/tmdb/* ke TMDB. API key hanya ada di server.
app.use('/api/tmdb', async (req, res) => {
  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: 'TMDB_API_KEY belum diisi di server. Salin .env.example ke .env.' })
  }

  // req.url di sini sudah relatif terhadap /api/tmdb, mis. /trending/all/week?x=1
  const pathname = req.url.split('?')[0]
  if (!isPathAllowed(pathname)) {
    return res.status(404).json({ error: 'Endpoint TMDB tidak diizinkan.' })
  }

  // Cache hanya untuk GET (path sudah di-whitelist, jadi key aman dipakai).
  if (req.method === 'GET') {
    const cached = tmdbCache.get(req.url)
    if (cached && Date.now() - cached.time < TMDB_CACHE_TTL) {
      res.status(cached.status)
      res.set('Content-Type', cached.contentType)
      return res.send(cached.body)
    }
  }

  const query = new URLSearchParams(req.query)
  query.set('api_key', API_KEY)
  if (!query.has('language')) query.set('language', 'id-ID')

  try {
    const upstream = await fetch(`${TMDB_BASE}${pathname}?${query.toString()}`)
    const body = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'

    if (req.method === 'GET' && upstream.status === 200) {
      cacheTmdb(req.url, { body, contentType, status: upstream.status, time: Date.now() })
    }

    res.status(upstream.status)
    res.set('Content-Type', contentType)
    res.send(body)
  } catch {
    res.status(502).json({ error: 'Gagal terhubung ke server TMDB.' })
  }
})

// --- Login GitHub (OAuth) ---

const githubClientId = process.env.GITHUB_CLIENT_ID
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET

function githubConfigured() {
  return Boolean(githubClientId && githubClientSecret)
}

app.get('/api/auth/login', (req, res) => {
  if (!githubConfigured()) {
    return res.status(503).json({
      error:
        'Login GitHub belum dikonfigurasi. Isi GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET di .env.',
    })
  }

  // State anti-CSRF disimpan di cookie httpOnly lalu dibandingkan saat callback.
  const state = randomToken(16)
  res.setHeader(
    'Set-Cookie',
    buildCookie(OAUTH_STATE_COOKIE, state, {
      maxAge: oauthStateMaxAgeSeconds(),
      secure: isSecureCookie(),
    }),
  )
  res.redirect(githubAuthorizeUrl(state))
})

app.get('/api/auth/callback', requireDb, async (req, res) => {
  if (!githubConfigured()) {
    return res.status(503).json({ error: 'Login GitHub belum dikonfigurasi.' })
  }

  const clearStateCookie = buildCookie(OAUTH_STATE_COOKIE, '', {
    maxAge: 0,
    secure: isSecureCookie(),
  })
  const stateCookie = parseCookies(req.headers.cookie)[OAUTH_STATE_COOKIE] ?? ''

  if (!req.query.state || req.query.state !== stateCookie) {
    res.setHeader('Set-Cookie', clearStateCookie)
    return res.status(400).send('State tidak cocok (kemungkinan serangan CSRF).')
  }

  const code = String(req.query.code ?? '')
  if (!code) {
    res.setHeader('Set-Cookie', clearStateCookie)
    return res.status(400).send('Kode OAuth tidak ditemukan.')
  }

  try {
    const accessToken = await exchangeCodeForToken({
      code,
      clientId: githubClientId,
      clientSecret: githubClientSecret,
    })
    if (!accessToken) {
      res.setHeader('Set-Cookie', clearStateCookie)
      return res.status(400).send('Gagal menukar kode OAuth dengan token.')
    }

    const ghUser = await fetchGithubUser(accessToken)
    if (!ghUser || !ghUser.id) {
      res.setHeader('Set-Cookie', clearStateCookie)
      return res.status(401).send('Gagal mengambil profil GitHub.')
    }

    await ensureSchema(db)
    await upsertUser(db, ghUser)

    const token = randomToken(32)
    const maxAge = sessionMaxAgeSeconds()
    await createSession(db, token, ghUser.id, Date.now() + maxAge * 1000)

    res.setHeader('Set-Cookie', [
      clearStateCookie,
      buildCookie(SESSION_COOKIE, token, { maxAge, secure: isSecureCookie() }),
    ])
    res.redirect(appUrl())
  } catch {
    res.setHeader('Set-Cookie', clearStateCookie)
    res.status(500).send('Terjadi kesalahan saat login. Coba lagi.')
  }
})

app.get('/api/auth/me', requireDb, async (req, res) => {
  try {
    const user = await getSessionUser(db, sessionToken(req))
    if (!user) return res.status(401).json({ error: 'Login diperlukan.' })
    res.json({ user })
  } catch {
    res.status(500).json({ error: 'Gagal membaca sesi.' })
  }
})

app.post('/api/auth/logout', requireDb, async (req, res) => {
  const token = sessionToken(req)
  try {
    await deleteSession(db, token)
  } catch {
    // Penghapusan sesi di DB gagal — cookie tetap dibersihkan di klien.
  }
  res.setHeader(
    'Set-Cookie',
    buildCookie(SESSION_COOKIE, '', { maxAge: 0, secure: isSecureCookie() }),
  )
  res.json({ ok: true })
})

// --- Daftar Saya (My List) ---
app.get('/api/my-list', requireDb, requireAuth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT ${MOVIE_COLUMNS}
            FROM my_list l
            JOIN movies m ON m.movie_id = l.movie_id
            WHERE l.device_id = ?
            ORDER BY l.added_at DESC`,
      args: [req.ownerKey],
    })
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Gagal membaca Daftar Saya.' })
  }
})

app.post('/api/my-list', requireDb, writeLimiter, requireAuth, async (req, res) => {
  const movie = normalizeMovie(req.body?.movie)
  if (!movie) return res.status(400).json({ error: 'Data film tidak valid.' })
  try {
    await ensureSchema(db)
    await upsertDevice(db, req.ownerKey)
    await upsertMovie(db, movie)
    await db.execute({
      sql: `INSERT INTO my_list (device_id, movie_id, added_at) VALUES (?, ?, ?)
            ON CONFLICT (device_id, movie_id) DO NOTHING`,
      args: [req.ownerKey, movie.id, Date.now()],
    })
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Gagal menambah ke Daftar Saya.' })
  }
})

app.delete('/api/my-list/:movieId', requireDb, writeLimiter, requireAuth, async (req, res) => {
  const movieId = Number(req.params.movieId)
  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    return res.status(400).json({ error: 'ID film tidak valid.' })
  }
  try {
    await db.execute({
      sql: 'DELETE FROM my_list WHERE device_id = ? AND movie_id = ?',
      args: [req.ownerKey, movieId],
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Gagal menghapus dari Daftar Saya.' })
  }
})

// --- Riwayat tontonan (Watch History) ---
app.get('/api/watch-history', requireDb, requireAuth, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT ${WATCH_COLUMNS}
            FROM watch_history l
            JOIN movies m ON m.movie_id = l.movie_id
            WHERE l.device_id = ?
            ORDER BY l.watched_at DESC`,
      args: [req.ownerKey],
    })
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Gagal membaca riwayat tontonan.' })
  }
})

app.post('/api/watch-history', requireDb, writeLimiter, requireAuth, async (req, res) => {
  const movie = normalizeMovie(req.body?.movie)
  if (!movie) return res.status(400).json({ error: 'Data film tidak valid.' })

  const finiteNonNegative = (value) => {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  let progressSeconds = finiteNonNegative(req.body?.progress_seconds)
  let duration = finiteNonNegative(req.body?.duration)
  if (duration > 0 && progressSeconds > duration) progressSeconds = duration

  try {
    await ensureSchema(db)
    await upsertDevice(db, req.ownerKey)
    await upsertMovie(db, movie)
    await db.execute({
      sql: `INSERT INTO watch_history
              (device_id, movie_id, watched_at, progress_seconds, duration)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (device_id, movie_id) DO UPDATE SET
              watched_at = excluded.watched_at,
              progress_seconds = excluded.progress_seconds,
              duration = excluded.duration`,
      args: [req.ownerKey, movie.id, Date.now(), progressSeconds, duration],
    })
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Gagal mencatat riwayat tontonan.' })
  }
})

app.delete('/api/watch-history/:movieId', requireDb, writeLimiter, requireAuth, async (req, res) => {
  const movieId = Number(req.params.movieId)
  if (!Number.isSafeInteger(movieId) || movieId <= 0) {
    return res.status(400).json({ error: 'ID film tidak valid.' })
  }
  try {
    await db.execute({
      sql: 'DELETE FROM watch_history WHERE device_id = ? AND movie_id = ?',
      args: [req.ownerKey, movieId],
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Gagal menghapus riwayat tontonan.' })
  }
})

// Sajikan hasil build produksi (dist/) bila tersedia.
const distDir = path.join(rootDir, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

async function start() {
  if (db) {
    try {
      await ensureSchema(db)
      console.log('Terhubung ke database Turso.')
    } catch (err) {
      console.error('Gagal menginisialisasi database Turso:', err.message)
    }
  } else {
    console.warn('TURSO_DATABASE_URL belum diisi — endpoint Daftar Saya & riwayat dinonaktifkan.')
  }

  const server = app.listen(PORT, () => {
    console.log(`Server proxy TMDB berjalan di http://localhost:${PORT}`)
  })

  // Anti slow-request (Slowloris/drain): batasi waktu terima header & durasi request.
  server.headersTimeout = 15 * 1000
  server.requestTimeout = 30 * 1000
}

start()
