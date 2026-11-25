import { useEffect, useState } from 'react'
import { normalizeMovie } from '../lib/movie.js'
import { fetchWatchHistory, recordWatch, removeFromWatchHistory } from '../api.js'

// Kunci penyimpanan lokal dipisah per profil aktif supaya fallback lokal juga
// tidak bercampur antar profil (termasuk profil "Tamu").
function getStorageKey() {
  try {
    const raw = sessionStorage.getItem('netflix-clone-active-profile')
    const profile = raw ? JSON.parse(raw) : null
    const id = typeof profile?.id === 'string' ? profile.id : 'default'
    return `netflix-clone-watch-history:${id}`
  } catch {
    return 'netflix-clone-watch-history:default'
  }
}

// Fallback lokal: dipakai untuk mode tamu dan saat database Turso tidak bisa
// dihubungi, supaya riwayat tontonan tetap berfungsi.
function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(getStorageKey())
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalHistory(items) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(items))
  } catch {
    // Storage penuh/diblokir — abaikan.
  }
}

export function useWatchHistory() {
  const [items, setItems] = useState([])
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchWatchHistory()
      .then((list) => {
        if (!cancelled) {
          setItems(Array.isArray(list) ? list : [])
          setUsingFallback(false)
        }
      })
      .catch(() => {
        // Riwayat tidak tersedia (mis. DB belum dikonfigurasi atau mode tamu)
        // — pakai penyimpanan lokal.
        if (!cancelled) {
          setItems(loadLocalHistory())
          setUsingFallback(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (usingFallback) saveLocalHistory(items)
  }, [items, usingFallback])

  const record = (movie, progressSeconds = 0, duration = 0) => {
    const normalized = {
      ...normalizeMovie(movie),
      progress_seconds: progressSeconds,
      duration,
    }
    // Optimistic: pindahkan ke posisi teratas riwayat.
    setItems((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)])

    if (usingFallback) return

    recordWatch(normalized, progressSeconds, duration).catch(() => {
      // Gagal sinkron — biarkan UI tetap, server tidak berubah.
    })
  }

  const remove = (movieId) => {
    const removed = items.find((item) => item.id === movieId)
    // Optimistic: langsung hapus dari daftar.
    setItems((prev) => prev.filter((item) => item.id !== movieId))

    if (usingFallback) return

    removeFromWatchHistory(movieId).catch(() => {
      // Gagal hapus di server — kembalikan item yang tadi dihapus.
      if (removed) {
        setItems((prev) => [removed, ...prev.filter((item) => item.id !== movieId)])
      }
    })
  }

  return { items, record, remove }
}
