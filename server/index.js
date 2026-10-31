import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY = process.env.TMDB_API_KEY
const PORT = process.env.PORT || 4000

const app = express()

// Proxy semua request /api/tmdb/* ke TMDB. API key hanya ada di server.
app.use('/api/tmdb', async (req, res) => {
  if (!API_KEY) {
    return res
      .status(500)
      .json({ error: 'TMDB_API_KEY belum diisi di server. Salin .env.example ke .env.' })
  }

  // req.url di sini sudah relatif terhadap /api/tmdb, mis. /trending/all/week?x=1
  const pathname = req.url.split('?')[0]
  const query = new URLSearchParams(req.query)
  query.set('api_key', API_KEY)
  if (!query.has('language')) query.set('language', 'id-ID')

  try {
    const upstream = await fetch(`${TMDB_BASE}${pathname}?${query.toString()}`)
    res.status(upstream.status)
    res.set('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.send(await upstream.text())
  } catch {
    res.status(502).json({ error: 'Gagal terhubung ke server TMDB.' })
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

app.listen(PORT, () => {
  console.log(`Server proxy TMDB berjalan di http://localhost:${PORT}`)
})
