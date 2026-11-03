// Vercel Function (satu entry point untuk semua /api/*).
// Subpath diteruskan lewat query param `path` oleh rewrite di vercel.json
// ("/api/:path*" -> "/api"), lalu dirutekan di sini.
import { createClient } from '@libsql/client'
import {
  ensureSchema,
  normalizeMovie,
  upsertDevice,
  upsertMovie,
  MOVIE_COLUMNS,
  WATCH_COLUMNS,
} from '../server/schema.js'

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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getDbClient() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  return url ? createClient({ url, authToken: token }) : null
}

// Ambil subpath API. Prioritas: query param `path` (hasil rewrite), lalu pathname.
function resolveApiPath(url) {
  const fromQuery = url.searchParams.get('path')
  if (fromQuery != null && fromQuery !== '') return fromQuery
  if (url.pathname.startsWith('/api/')) return url.pathname.slice('/api/'.length)
  return ''
}

function deviceIdFromQuery(url) {
  return String(url.searchParams.get('device_id') ?? '').trim()
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
      headers: { 'Content-Type': contentType },
    })
  } catch {
    return json({ error: 'Gagal terhubung ke server TMDB.' }, 502)
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url, 'http://localhost')
    const apiPath = resolveApiPath(url)

    // --- Proxy TMDB ---
    if (apiPath === 'tmdb' || apiPath.startsWith('tmdb/')) {
      // apiPath mis. "tmdb/trending/all/week" -> "/trending/all/week"
      const tmdbPath = apiPath.slice('tmdb'.length)
      return handleTmdb(url, tmdbPath)
    }

    const db = getDbClient()

    // --- Daftar Saya (My List) ---
    if (apiPath === 'my-list') {
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)

      if (request.method === 'GET') {
        const deviceId = deviceIdFromQuery(url)
        if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
        try {
          await ensureSchema(db)
          const result = await db.execute({
            sql: `SELECT ${MOVIE_COLUMNS}
                  FROM my_list l
                  JOIN movies m ON m.movie_id = l.movie_id
                  WHERE l.device_id = ?
                  ORDER BY l.added_at DESC`,
            args: [deviceId],
          })
          return json(result.rows)
        } catch {
          return json({ error: 'Gagal membaca Daftar Saya.' }, 500)
        }
      }

      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}))
        const deviceId = String(body.device_id ?? '').trim() || deviceIdFromQuery(url)
        if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
        const movie = normalizeMovie(body.movie)
        if (!movie) return json({ error: 'Data film tidak valid.' }, 400)
        try {
          await ensureSchema(db)
          await upsertDevice(db, deviceId)
          await upsertMovie(db, movie)
          await db.execute({
            sql: `INSERT INTO my_list (device_id, movie_id, added_at) VALUES (?, ?, ?)
                  ON CONFLICT (device_id, movie_id) DO NOTHING`,
            args: [deviceId, movie.id, Date.now()],
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
      const deviceId = deviceIdFromQuery(url)
      if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
      const movieId = Number(myListDelete[1])
      if (!Number.isFinite(movieId)) return json({ error: 'ID film tidak valid.' }, 400)
      try {
        await ensureSchema(db)
        await db.execute({
          sql: 'DELETE FROM my_list WHERE device_id = ? AND movie_id = ?',
          args: [deviceId, movieId],
        })
        return json({ ok: true })
      } catch {
        return json({ error: 'Gagal menghapus dari Daftar Saya.' }, 500)
      }
    }

    // --- Riwayat tontonan (Watch History) ---
    if (apiPath === 'watch-history') {
      if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)

      if (request.method === 'GET') {
        const deviceId = deviceIdFromQuery(url)
        if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
        try {
          await ensureSchema(db)
          const result = await db.execute({
            sql: `SELECT ${WATCH_COLUMNS}
                  FROM watch_history l
                  JOIN movies m ON m.movie_id = l.movie_id
                  WHERE l.device_id = ?
                  ORDER BY l.watched_at DESC`,
            args: [deviceId],
          })
          return json(result.rows)
        } catch {
          return json({ error: 'Gagal membaca riwayat tontonan.' }, 500)
        }
      }

      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}))
        const deviceId = String(body.device_id ?? '').trim() || deviceIdFromQuery(url)
        if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
        const movie = normalizeMovie(body.movie)
        if (!movie) return json({ error: 'Data film tidak valid.' }, 400)

        let progressSeconds = Math.max(0, Number(body.progress_seconds) || 0)
        let duration = Math.max(0, Number(body.duration) || 0)
        if (duration > 0 && progressSeconds > duration) progressSeconds = duration

        try {
          await ensureSchema(db)
          await upsertDevice(db, deviceId)
          await upsertMovie(db, movie)
          await db.execute({
            sql: `INSERT INTO watch_history
                    (device_id, movie_id, watched_at, progress_seconds, duration)
                  VALUES (?, ?, ?, ?, ?)
                  ON CONFLICT (device_id, movie_id) DO UPDATE SET
                    watched_at = excluded.watched_at,
                    progress_seconds = excluded.progress_seconds,
                    duration = excluded.duration`,
            args: [deviceId, movie.id, Date.now(), progressSeconds, duration],
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
      const deviceId = deviceIdFromQuery(url)
      if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
      const movieId = Number(historyDelete[1])
      if (!Number.isFinite(movieId)) return json({ error: 'ID film tidak valid.' }, 400)
      try {
        await ensureSchema(db)
        await db.execute({
          sql: 'DELETE FROM watch_history WHERE device_id = ? AND movie_id = ?',
          args: [deviceId, movieId],
        })
        return json({ ok: true })
      } catch {
        return json({ error: 'Gagal menghapus riwayat tontonan.' }, 500)
      }
    }

    return json({ error: 'Tidak ditemukan.' }, 404)
  },
}
