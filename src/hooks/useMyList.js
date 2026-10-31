import { useEffect, useState } from 'react'

const STORAGE_KEY = 'netflix-clone-my-list'

// Simpan hanya field yang dibutuhkan agar localStorage tetap ringan.
function normalizeMovie(movie) {
  return {
    id: movie.id,
    title: movie.title || movie.name || movie.original_name || '',
    name: movie.name || movie.title || movie.original_name || '',
    overview: movie.overview || '',
    poster_path: movie.poster_path || movie.backdrop_path || null,
    backdrop_path: movie.backdrop_path || movie.poster_path || null,
    vote_average: movie.vote_average ?? 0,
    media_type: movie.media_type || 'movie',
  }
}

function loadList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useMyList() {
  const [items, setItems] = useState(loadList)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage penuh atau diblokir — abaikan agar aplikasi tetap jalan.
    }
  }, [items])

  const isInList = (id) => items.some((item) => item.id === id)

  const toggle = (movie) => {
    setItems((prev) =>
      prev.some((item) => item.id === movie.id)
        ? prev.filter((item) => item.id !== movie.id)
        : [...prev, normalizeMovie(movie)],
    )
  }

  return { items, isInList, toggle }
}
