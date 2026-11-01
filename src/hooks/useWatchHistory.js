import { useEffect, useState } from 'react'
import { normalizeMovie } from '../lib/movie.js'
import { fetchWatchHistory, recordWatch } from '../api.js'
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

  const record = (movie) => {
    const normalized = normalizeMovie(movie)
    // Optimistic: pindahkan ke posisi teratas riwayat.
    setItems((prev) => [normalized, ...prev.filter((item) => item.id !== normalized.id)])
    recordWatch(deviceId, normalized).catch(() => {
      // Gagal sinkron — biarkan UI tetap, server tidak berubah.
    })
  }

  return { items, record }
}
