import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@libsql/client'
import {
  ensureSchema,
  normalizeMovie,
  upsertDevice,
  upsertMovie,
  MOVIE_COLUMNS,
  WATCH_COLUMNS,
} from './schema.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY = process.env.TMDB_API_KEY
const PORT = process.env.PORT || 4000

const app = express()
app.use(express.json())

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

function requireDeviceId(req, res, next) {
  const deviceId = String(req.query.device_id ?? req.body?.device_id ?? '').trim()
  if (!deviceId) {
    return res.status(400).json({ error: 'device_id wajib diisi.' })
  }
  req.deviceId = deviceId
  next()
}

// Kolom film & riwayat dikembalikan lewat relasi JOIN ke tabel `movies`
// (lihat server/schema.js). Alias `id` tetap dipakai agar kontrak API sama.

// --- Cache & proteksi untuk proxy TMDB ---

// Cache in-memory untuk response TMDB (GET 200 saja). Mengurangi jumlah
// request ke TMDB ketika banyak pengguna membuka halaman yang sama.
const TMDB_CACHE_TTL = 10 * 60 * 1000 // 10 menit
const tmdbCache = new Map()

// Rate limit sederhana per IP (fixed window 1 menit).
const RATE_WINDOW_MS = 60 * 1000
const RATE_MAX = 120
const rateBuckets = new Map()

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown'
  const now = Date.now()
  const bucket = rateBuckets.get(ip)

  if (!bucket || now - bucket.start >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { start: now, count: 1 })
    return next()
  }

  bucket.count += 1
  if (bucket.count > RATE_MAX) {
    return res.status(429).json({ error: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' })
  }
  return next()
}

app.use('/api', rateLimit)

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
      tmdbCache.set(req.url, { body, contentType, status: upstream.status, time: Date.now() })
    }

    res.status(upstream.status)
    res.set('Content-Type', contentType)
    res.send(body)
  } catch {
    res.status(502).json({ error: 'Gagal terhubung ke server TMDB.' })
  }
})

// --- Daftar Saya (My List) ---
app.get('/api/my-list', requireDb, requireDeviceId, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT ${MOVIE_COLUMNS}
            FROM my_list l
            JOIN movies m ON m.movie_id = l.movie_id
            WHERE l.device_id = ?
            ORDER BY l.added_at DESC`,
      args: [req.deviceId],
    })
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Gagal membaca Daftar Saya.' })
  }
})

app.post('/api/my-list', requireDb, requireDeviceId, async (req, res) => {
  const movie = normalizeMovie(req.body?.movie)
  if (!movie) return res.status(400).json({ error: 'Data film tidak valid.' })
  try {
    await ensureSchema(db)
    await upsertDevice(db, req.deviceId)
    await upsertMovie(db, movie)
    await db.execute({
      sql: `INSERT INTO my_list (device_id, movie_id, added_at) VALUES (?, ?, ?)
            ON CONFLICT (device_id, movie_id) DO NOTHING`,
      args: [req.deviceId, movie.id, Date.now()],
    })
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Gagal menambah ke Daftar Saya.' })
  }
})

app.delete('/api/my-list/:movieId', requireDb, requireDeviceId, async (req, res) => {
  const movieId = Number(req.params.movieId)
  if (!Number.isFinite(movieId)) return res.status(400).json({ error: 'ID film tidak valid.' })
  try {
    await db.execute({
      sql: 'DELETE FROM my_list WHERE device_id = ? AND movie_id = ?',
      args: [req.deviceId, movieId],
    })
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Gagal menghapus dari Daftar Saya.' })
  }
})

// --- Riwayat tontonan (Watch History) ---
app.get('/api/watch-history', requireDb, requireDeviceId, async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT ${WATCH_COLUMNS}
            FROM watch_history l
            JOIN movies m ON m.movie_id = l.movie_id
            WHERE l.device_id = ?
            ORDER BY l.watched_at DESC`,
      args: [req.deviceId],
    })
    res.json(result.rows)
  } catch {
    res.status(500).json({ error: 'Gagal membaca riwayat tontonan.' })
  }
})

app.post('/api/watch-history', requireDb, requireDeviceId, async (req, res) => {
  const movie = normalizeMovie(req.body?.movie)
  if (!movie) return res.status(400).json({ error: 'Data film tidak valid.' })

        let progressSeconds = Math.max(0, Number(req.body?.progress_seconds) || 0)
        let duration = Math.max(0, Number(req.body?.duration) || 0)
  if (duration > 0 && progressSeconds > duration) progressSeconds = duration

  try {
    await ensureSchema(db)
    await upsertDevice(db, req.deviceId)
    await upsertMovie(db, movie)
    await db.execute({
      sql: `INSERT INTO watch_history
              (device_id, movie_id, watched_at, progress_seconds, duration)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (device_id, movie_id) DO UPDATE SET
              watched_at = excluded.watched_at,
              progress_seconds = excluded.progress_seconds,
              duration = excluded.duration`,
      args: [req.deviceId, movie.id, Date.now(), progressSeconds, duration],
    })
    res.status(201).json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Gagal mencatat riwayat tontonan.' })
  }
})

app.delete('/api/watch-history/:movieId', requireDb, requireDeviceId, async (req, res) => {
  const movieId = Number(req.params.movieId)
  if (!Number.isFinite(movieId)) return res.status(400).json({ error: 'ID film tidak valid.' })
  try {
    await db.execute({
      sql: 'DELETE FROM watch_history WHERE device_id = ? AND movie_id = ?',
      args: [req.deviceId, movieId],
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

  app.listen(PORT, () => {
    console.log(`Server proxy TMDB berjalan di http://localhost:${PORT}`)
  })
}

start()
