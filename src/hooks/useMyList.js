import { useEffect, useState } from 'react'
import { normalizeMovie } from '../lib/movie.js'
import { addToMyList, fetchMyList, removeFromMyList } from '../api.js'

// Kunci penyimpanan lokal dipisah per profil aktif supaya fallback lokal juga
// tidak bercampur antar profil.
function getStorageKey() {
  try {
    const raw = sessionStorage.getItem('netflix-clone-active-profile')
    const profile = raw ? JSON.parse(raw) : null
    const id = typeof profile?.id === 'string' ? profile.id : 'default'
    return `netflix-clone-my-list:${id}`
  } catch {
    return 'netflix-clone-my-list:default'
  }
}

// Fallback lokal: dipakai hanya bila database Turso tidak bisa dihubungi,
// supaya fitur Daftar Saya tetap berfungsi.
function loadLocalList() {
  try {
    const raw = localStorage.getItem(getStorageKey())
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalList(items) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(items))
  } catch {
    // Storage penuh/diblokir — abaikan.
  }
}

export function useMyList() {
  const [items, setItems] = useState([])
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchMyList()
      .then((list) => {
        if (cancelled) return
        setItems(Array.isArray(list) ? list : [])
        setUsingFallback(false)
      })
      .catch(() => {
        if (cancelled) return
        setItems(loadLocalList())
        setUsingFallback(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (usingFallback) saveLocalList(items)
  }, [items, usingFallback])

  const isInList = (id) => items.some((item) => item.id === id)

  const toggle = (movie) => {
    const normalized = normalizeMovie(movie)
    const exists = items.some((item) => item.id === normalized.id)

    // Optimistic update: langsung ubah UI, sinkronkan ke server setelahnya.
    setItems((prev) =>
      exists ? prev.filter((item) => item.id !== normalized.id) : [normalized, ...prev],
    )

    if (usingFallback) return

    const request = exists
      ? removeFromMyList(normalized.id)
      : addToMyList(normalized)

    request.catch(() => {
      // Kembalikan state bila sinkronisasi gagal.
      setItems((prev) =>
        exists
          ? [normalized, ...prev]
          : prev.filter((item) => item.id !== normalized.id),
      )
    })
  }

  return { items, isInList, toggle }
}
