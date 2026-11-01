import { useEffect, useState } from 'react'
import { normalizeMovie } from '../lib/movie.js'
import { fetchWatchHistory, recordWatch, removeFromWatchHistory } from '../api.js'
import { useDeviceId } from './useDeviceId.js'

export function useWatchHistory() {
  const deviceId = useDeviceId()
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false

    fetchWatchHistory(deviceId)
      .then((list) => {
        if (!cancelled) setItems(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        // Riwayat tidak tersedia (mis. DB belum dikonfigurasi) — biarkan kosong.
      })

    return () => {
      cancelled = true
    }
  }, [deviceId])

  const record = (movie, progressSeconds = 0, duration = 0) => {
    const normalized = {
      ...normalizeMovie(movie),
      progress_seconds: progressSeconds,
      duration,
    }
    // Optimistic: pindahkan ke posisi teratas riwayat.
    setItems((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)])
    recordWatch(deviceId, normalized, progressSeconds, duration).catch(() => {
      // Gagal sinkron — biarkan UI tetap, server tidak berubah.
    })
  }

  const remove = (movieId) => {
    const removed = items.find((item) => item.id === movieId)
    // Optimistic: langsung hapus dari daftar.
    setItems((prev) => prev.filter((item) => item.id !== movieId))
    removeFromWatchHistory(deviceId, movieId).catch(() => {
      // Gagal hapus di server — kembalikan item yang tadi dihapus.
      if (removed) {
        setItems((prev) => [removed, ...prev.filter((item) => item.id !== movieId)])
      }
    })
  }

  return { items, record, remove }
}
