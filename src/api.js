// Helper untuk memanggil backend proxy yang meneruskan request ke TMDB.
// API key disimpan di server (server/index.js), tidak terekspos ke browser.

const BASE_URL = '/api/tmdb'

// URL dasar untuk mengambil gambar (CDN TMDB, tidak butuh API key).
export const IMG_BASE_URL = 'https://image.tmdb.org/t/p'

// Cache dua lapis:
// 1. Memori (Map) — mencegah request berulang dalam satu sesi.
// 2. localStorage — bertahan saat halaman dimuat ulang, sehingga halaman
//    utama langsung menampilkan data lama lalu refresh di latar belakang
//    (stale-while-revalidate) supaya tidak terasa lemot.
const CACHE_TTL = 10 * 60 * 1000
const STALE_TTL = 24 * 60 * 60 * 1000
const STORAGE_PREFIX = 'netflix-clone-tmdb:'
const MAX_STORED_ENTRIES = 60

const cache = new Map()
const inFlight = new Map()

function buildKey(pathname, query) {
  return `${pathname}?${query.toString()}`
}

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`
}

function parseStored(raw) {
  try {
    const entry = JSON.parse(raw)
    return entry && typeof entry === 'object' && Number.isFinite(entry.time) ? entry : null
  } catch {
    return null
  }
}

function readStored(key) {
  try {
    return parseStored(localStorage.getItem(storageKey(key)))
  } catch {
    return null
  }
}

function writeStored(key, data) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify({ data, time: Date.now() }))
  } catch {
    // Kuota penuh — bersihkan entri kedaluwarsa lalu coba sekali lagi.
    pruneStorage()
    try {
      localStorage.setItem(storageKey(key), JSON.stringify({ data, time: Date.now() }))
    } catch {
      // Storage diblokir/penuh: biarkan cache tetap jalan di memori saja.
    }
  }
}

function pruneStorage() {
  try {
    const now = Date.now()
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k)
    }

    const entries = keys
      .map((k) => ({ key: k, entry: parseStored(localStorage.getItem(k)) }))
      .filter((item) => item.entry)
      .sort((a, b) => a.entry.time - b.entry.time)

    // Hapus yang sudah kedaluwarsa total.
    for (const { key, entry } of entries) {
      if (now - entry.time > STALE_TTL) localStorage.removeItem(key)
    }

    // Batasi jumlah entri agar tidak memenuhi kuota localStorage.
    const live = entries.filter(({ entry }) => now - entry.time <= STALE_TTL)
    for (let i = 0; i < live.length - MAX_STORED_ENTRIES; i++) {
      localStorage.removeItem(live[i].key)
    }
  } catch {
    // Abaikan — pruning bersifat best-effort.
  }
}

// Refresh data di latar belakang tanpa menahan UI (stale-while-revalidate).
function refreshInBackground(pathname, query, key) {
  if (inFlight.has(key)) return

  const request = fetch(`${BASE_URL}${pathname}?${query}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Gagal memuat data (status ${response.status})`)
      }
      return response.json()
    })
    .then((data) => {
      cache.set(key, { data, time: Date.now() })
      writeStored(key, data)
    })
    .catch(() => {
      // Gagal refresh — data lama tetap dipakai, coba lagi lain waktu.
    })
    .finally(() => {
      inFlight.delete(key)
    })

  inFlight.set(key, request)
}

export async function fetchFromTMDB(path, params = {}) {
  const [pathname, existingQuery] = path.split('?')
  const query = new URLSearchParams(existingQuery ?? '')
  query.set('language', 'id-ID')
  Object.entries(params).forEach(([key, value]) => query.set(key, value))

  const key = buildKey(pathname, query)

  // 1. Cache memori (paling cepat) bila masih segar.
  const cached = cache.get(key)
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data
  }

  // 2. Cache persisten: sajikan data lama seketika, lalu refresh di latar belakang.
  const stored = readStored(key)
  if (stored && stored.data != null) {
    const age = Date.now() - stored.time
    cache.set(key, { data: stored.data, time: stored.time })
    if (age >= CACHE_TTL) refreshInBackground(pathname, query, key)
    return stored.data
  }

  // 3. Deduplikasi: kalau request yang sama masih berjalan, ikut promise-nya.
  if (inFlight.has(key)) {
    return inFlight.get(key)
  }

  // 4. Request baru (tidak ada cache).
  const request = fetch(`${BASE_URL}${pathname}?${query}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Gagal memuat data (status ${response.status})`)
      }
      return response.json()
    })
    .then((data) => {
      cache.set(key, { data, time: Date.now() })
      writeStored(key, data)
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
