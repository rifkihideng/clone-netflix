import { useCallback, useEffect, useState } from 'react'
import { fetchMe, logoutApi } from '../api.js'
import {
  GUEST_USER,
  clearGuestFlag,
  isGuest,
  readGuestFlag,
  setGuestFlag,
} from '../lib/guest.js'

// Mengelola status login (sesi cookie httpOnly atau mode tamu). Dipakai untuk
// mengunci seluruh aplikasi di belakang halaman login (full-gate).
export function useAuth() {
  const [user, setUser] = useState(() => (readGuestFlag() ? GUEST_USER : null))
  const [loading, setLoading] = useState(() => !readGuestFlag())

  useEffect(() => {
    // Mode tamu tidak memanggil server — langsung dianggap "login".
    if (readGuestFlag()) return

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

  const loginAsGuest = useCallback(() => {
    setGuestFlag()
    setUser(GUEST_USER)
  }, [])

  const logout = useCallback(async () => {
    if (isGuest(user)) {
      clearGuestFlag()
      setUser(null)
      return
    }

    try {
      await logoutApi()
    } catch {
      // Gagal logout di server — tetap bersihkan state lokal.
    }
    setUser(null)
  }, [user])

  return { user, loading, logout, loginAsGuest }
}