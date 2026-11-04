import { useCallback, useEffect, useState } from 'react'
import { fetchMe, logoutApi } from '../api.js'

// Mengelola status login (sesi cookie httpOnly). Dipakai untuk mengunci
// seluruh aplikasi di belakang halaman login (full-gate).
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchMe()
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch {
      // Gagal logout di server — tetap bersihkan state lokal.
    }
    setUser(null)
  }, [])

  return { user, loading, logout }
}