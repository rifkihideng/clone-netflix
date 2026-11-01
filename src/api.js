// Helper untuk memanggil backend proxy yang meneruskan request ke TMDB.
// API key disimpan di server (server/index.js), tidak terekspos ke browser.

const BASE_URL = '/api/tmdb'

// URL dasar untuk mengambil gambar (CDN TMDB, tidak butuh API key).
export const IMG_BASE_URL = 'https://image.tmdb.org/t/p'

// Cache di memori: mencegah request berulang ke endpoint yang sama.
// TTL 10 menit supaya data tetap relatif segar.
const CACHE_TTL = 10 * 60 * 1000
const cache = new Map()
const inFlight = new Map()

function buildKey(pathname, query) {
  return `${pathname}?${query.toString()}`
}

export async function fetchFromTMDB(path, params = {}) {
  const [pathname, existingQuery] = path.split('?')
  const query = new URLSearchParams(existingQuery ?? '')
  query.set('language', 'id-ID')
  Object.entries(params).forEach(([key, value]) => query.set(key, value))

  const key = buildKey(pathname, query)

  // 1. Kembalikan cache kalau masih berlaku.
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data
  }

  // 2. Deduplikasi: kalau request yang sama masih berjalan, ikut promise-nya.
  if (inFlight.has(key)) {
    return inFlight.get(key)
  }

  // 3. Request baru.
  const request = fetch(`${BASE_URL}${pathname}?${query}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Gagal memuat data (status ${response.status})`)
      }
      return response.json()
    })
    .then((data) => {
      cache.set(key, { data, time: Date.now() })
      return data
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, request)
  return request
}

// Daftar kategori/endpoint yang ditampilkan di beranda.
export const requests = {
  trending: '/trending/all/week',
  topRated: '/movie/top_rated',
  action: '/discover/movie?with_genres=28',
  comedy: '/discover/movie?with_genres=35',
  horror: '/discover/movie?with_genres=27',
  documentaries: '/discover/movie?with_genres=99',
}

// --- API Daftar Saya & riwayat tontonan (disimpan di Turso) ---

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Gagal memuat data (status ${response.status})`)
  }
  return response.json()
}

function deviceQuery(deviceId) {
  return `device_id=${encodeURIComponent(deviceId)}`
}

export async function fetchMyList(deviceId) {
  return requestJson(`/api/my-list?${deviceQuery(deviceId)}`)
}

export async function addToMyList(deviceId, movie) {
  return requestJson('/api/my-list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId, movie }),
  })
}

export async function removeFromMyList(deviceId, movieId) {
  return requestJson(`/api/my-list/${movieId}?${deviceQuery(deviceId)}`, { method: 'DELETE' })
}

export async function fetchWatchHistory(deviceId) {
  return requestJson(`/api/watch-history?${deviceQuery(deviceId)}`)
}

export async function recordWatch(deviceId, movie, progressSeconds = 0, duration = 0) {
  return requestJson('/api/watch-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id: deviceId,
      movie,
      progress_seconds: progressSeconds,
      duration,
    }),
  })
}

export async function removeFromWatchHistory(deviceId, movieId) {
  return requestJson(`/api/watch-history/${movieId}?${deviceQuery(deviceId)}`, {
    method: 'DELETE',
  })
}
