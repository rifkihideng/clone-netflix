// Vercel Function (catch-all untuk /api/*).
// Meniru perilaku server/index.js, tetapi memakai Web API (Request/Response)
// supaya bisa berjalan sebagai satu serverless function di Vercel.
import { createClient } from '@libsql/client'

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

// Pilih hanya field yang disimpan supaya payload dari klien tidak menulis kolom asing.
function normalizeMovie(movie) {
  if (!movie || typeof movie !== 'object') return null
  const id = Number(movie.id)
  if (!Number.isFinite(id)) return null
  const isTV = movie.media_type === 'tv' || (!movie.media_type && movie.name && !movie.title)
  return {
    id,
    title: movie.title || movie.name || movie.original_name || '',
    name: movie.name || movie.title || movie.original_name || '',
    overview: movie.overview || '',
    poster_path: movie.poster_path || movie.backdrop_path || null,
    backdrop_path: movie.backdrop_path || movie.poster_path || null,
    vote_average: Number(movie.vote_average) || 0,
    media_type: movie.media_type || (isTV ? 'tv' : 'movie'),
  }
}

const MOVIE_COLUMNS = `
  movie_id AS id, title, name, overview, poster_path, backdrop_path,
  vote_average, media_type
`

const WATCH_COLUMNS = `
  movie_id AS id, title, name, overview, poster_path, backdrop_path,
  vote_average, media_type, progress_seconds, duration
`

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

let schemaPromise = null

// Buat tabel bila belum ada. Dijalankan sekali per instance (lazy).
function ensureSchema(db) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS my_list (
            device_id TEXT NOT NULL,
            movie_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            name TEXT NOT NULL,
            overview TEXT,
            poster_path TEXT,
            backdrop_path TEXT,
            vote_average REAL DEFAULT 0,
            media_type TEXT DEFAULT 'movie',
            added_at INTEGER NOT NULL,
            PRIMARY KEY (device_id, movie_id)
          )`,
          `CREATE TABLE IF NOT EXISTS watch_history (
            device_id TEXT NOT NULL,
            movie_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            name TEXT NOT NULL,
            overview TEXT,
            poster_path TEXT,
            backdrop_path TEXT,
            vote_average REAL DEFAULT 0,
            media_type TEXT DEFAULT 'movie',
            progress_seconds REAL DEFAULT 0,
            duration REAL DEFAULT 0,
            watched_at INTEGER NOT NULL,
            PRIMARY KEY (device_id, movie_id)
          )`,
        ],
        'write',
      )

      // Migrasi ringan dari versi lama (ALTER akan error bila kolom sudah ada).
      try {
        await db.execute({ sql: 'ALTER TABLE watch_history ADD COLUMN progress_seconds REAL DEFAULT 0' })
      } catch {}
      try {
        await db.execute({ sql: 'ALTER TABLE watch_history ADD COLUMN duration REAL DEFAULT 0' })
      } catch {}
    })().catch((err) => {
      schemaPromise = null
      throw err
    })
  }
  return schemaPromise
}

// Proxy permintaan /api/tmdb/* ke TMDB. API key hanya ada di sisi server.
async function handleTmdb(request, tmdbPath) {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return json({ error: 'TMDB_API_KEY belum diisi di server.' }, 500)
  }

  if (!isPathAllowed(tmdbPath)) {
    return json({ error: 'Endpoint TMDB tidak diizinkan.' }, 404)
  }

  const url = new URL(request.url)
  const query = new URLSearchParams(url.search)
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

function queryDeviceId(request) {
  return String(new URL(request.url).searchParams.get('device_id') ?? '').trim()
}

export default async function handler(request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // --- Proxy TMDB ---
  if (pathname === '/api/tmdb' || pathname.startsWith('/api/tmdb/')) {
    const tmdbPath = pathname.slice('/api/tmdb'.length)
    return handleTmdb(request, tmdbPath)
  }

  const db = getDbClient()

  // --- Daftar Saya (My List) ---
  if (pathname === '/api/my-list') {
    if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)

    if (request.method === 'GET') {
      const deviceId = queryDeviceId(request)
      if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
      try {
        await ensureSchema(db)
        const result = await db.execute({
          sql: `SELECT ${MOVIE_COLUMNS} FROM my_list WHERE device_id = ? ORDER BY added_at DESC`,
          args: [deviceId],
        })
        return json(result.rows)
      } catch {
        return json({ error: 'Gagal membaca Daftar Saya.' }, 500)
      }
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const deviceId = String(body.device_id ?? '').trim() || queryDeviceId(request)
      if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
      const movie = normalizeMovie(body.movie)
      if (!movie) return json({ error: 'Data film tidak valid.' }, 400)
      try {
        await ensureSchema(db)
        await db.execute({
          sql: `INSERT INTO my_list
                  (device_id, movie_id, title, name, overview, poster_path, backdrop_path, vote_average, media_type, added_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (device_id, movie_id) DO NOTHING`,
          args: [
            deviceId,
            movie.id,
            movie.title,
            movie.name,
            movie.overview,
            movie.poster_path,
            movie.backdrop_path,
            movie.vote_average,
            movie.media_type,
            Date.now(),
          ],
        })
        return json({ ok: true }, 201)
      } catch {
        return json({ error: 'Gagal menambah ke Daftar Saya.' }, 500)
      }
    }

    return json({ error: 'Metode tidak diizinkan.' }, 405)
  }

  const myListDelete = pathname.match(/^\/api\/my-list\/(\d+)$/)
  if (myListDelete && request.method === 'DELETE') {
    if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
    const deviceId = queryDeviceId(request)
    if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
    const movieId = Number(myListDelete[1])
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
  if (pathname === '/api/watch-history') {
    if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)

    if (request.method === 'GET') {
      const deviceId = queryDeviceId(request)
      if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
      try {
        await ensureSchema(db)
        const result = await db.execute({
          sql: `SELECT ${WATCH_COLUMNS} FROM watch_history WHERE device_id = ? ORDER BY watched_at DESC`,
          args: [deviceId],
        })
        return json(result.rows)
      } catch {
        return json({ error: 'Gagal membaca riwayat tontonan.' }, 500)
      }
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const deviceId = String(body.device_id ?? '').trim() || queryDeviceId(request)
      if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
      const movie = normalizeMovie(body.movie)
      if (!movie) return json({ error: 'Data film tidak valid.' }, 400)

      let progressSeconds = Math.max(0, Number(body.progress_seconds) || 0)
      let duration = Math.max(0, Number(body.duration) || 0)
      if (duration > 0 && progressSeconds > duration) progressSeconds = duration

      try {
        await ensureSchema(db)
        await db.execute({
          sql: `INSERT INTO watch_history
                  (device_id, movie_id, title, name, overview, poster_path, backdrop_path, vote_average, media_type, watched_at, progress_seconds, duration)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (device_id, movie_id) DO UPDATE SET
                  title = excluded.title,
                  name = excluded.name,
                  overview = excluded.overview,
                  poster_path = excluded.poster_path,
                  backdrop_path = excluded.backdrop_path,
                  vote_average = excluded.vote_average,
                  media_type = excluded.media_type,
                  watched_at = excluded.watched_at,
                  progress_seconds = excluded.progress_seconds,
                  duration = excluded.duration`,
          args: [
            deviceId,
            movie.id,
            movie.title,
            movie.name,
            movie.overview,
            movie.poster_path,
            movie.backdrop_path,
            movie.vote_average,
            movie.media_type,
            Date.now(),
            progressSeconds,
            duration,
          ],
        })
        return json({ ok: true }, 201)
      } catch {
        return json({ error: 'Gagal mencatat riwayat tontonan.' }, 500)
      }
    }

    return json({ error: 'Metode tidak diizinkan.' }, 405)
  }

  const historyDelete = pathname.match(/^\/api\/watch-history\/(\d+)$/)
  if (historyDelete && request.method === 'DELETE') {
    if (!db) return json({ error: 'Database Turso belum dikonfigurasi.' }, 503)
    const deviceId = queryDeviceId(request)
    if (!deviceId) return json({ error: 'device_id wajib diisi.' }, 400)
    const movieId = Number(historyDelete[1])
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
}
