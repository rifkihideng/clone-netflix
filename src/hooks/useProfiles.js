import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchProfiles,
  createProfile as apiCreateProfile,
  deleteProfile as apiDeleteProfile,
} from '../api.js'
import { isGuest } from '../lib/guest.js'

const STORAGE_KEY = 'netflix-clone-profiles'
const GUEST_STORAGE_KEY = 'netflix-clone-profiles:guest'
const DEFAULT_PROFILE = { id: 'github', name: 'Saya', avatar: '', color: '#e50914' }

// Profil tamu disimpan terpisah dari cache/fallback akun GitHub supaya tidak
// bercampur (guest murni lokal, tanpa panggilan server).
function storageKeyFor(user) {
  return isGuest(user) ? GUEST_STORAGE_KEY : STORAGE_KEY
}

function loadLocalProfiles(user) {
  try {
    const raw = localStorage.getItem(storageKeyFor(user))
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalProfiles(user, profiles) {
  try {
    localStorage.setItem(storageKeyFor(user), JSON.stringify(profiles))
  } catch {
    // Storage penuh/diblokir — abaikan.
  }
}

// Profil akun GitHub bersumber dari server (Turso) dan disinkronkan;
// localStorage hanya dipakai sebagai cache instan + fallback saat server tidak
// terjangkau. Profil tamu sepenuhnya lokal.
export function useProfiles(user) {
  const guest = isGuest(user)
  const [profiles, setProfiles] = useState(() => loadLocalProfiles(user))
  const [loading, setLoading] = useState(!guest)
  const [usingFallback, setUsingFallback] = useState(guest)
  const migratedRef = useRef(false)

  useEffect(() => {
    // Mode tamu: tidak ada sesi server, jadi langsung pakai profil lokal.
    if (guest) {
      setLoading(false)
      return
    }

    let cancelled = false

    fetchProfiles()
      .then((list) => {
        if (cancelled) return
        const serverProfiles = Array.isArray(list) && list.length > 0 ? list : [DEFAULT_PROFILE]
        setProfiles(serverProfiles)
        setUsingFallback(false)

        // Migrasi sekali: dorong profil lokal lama (buatan sebelum sinkronisasi
        // server) supaya tidak hilang.
        if (!migratedRef.current) {
          migratedRef.current = true
          const serverIds = new Set(serverProfiles.map((profile) => profile.id))
          const pending = loadLocalProfiles(user).filter(
            (profile) => profile.id !== 'github' && !serverIds.has(profile.id),
          )
          if (pending.length > 0) {
            Promise.allSettled(
              pending.map((profile) => apiCreateProfile(profile.name, profile.color)),
            )
              .then(() => fetchProfiles())
              .then((refreshed) => {
                if (!cancelled && Array.isArray(refreshed)) setProfiles(refreshed)
              })
              .catch(() => {})
          }
        }
      })
      .catch(() => {
        if (cancelled) return
        const local = loadLocalProfiles(user)
        setProfiles(
          local.length > 0
            ? local
            : [
                {
                  ...DEFAULT_PROFILE,
                  name: user?.login || DEFAULT_PROFILE.name,
                  avatar: user?.avatar_url || '',
                },
              ],
        )
        setUsingFallback(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, guest])

  useEffect(() => {
    if (usingFallback) saveLocalProfiles(user, profiles)
  }, [profiles, usingFallback, user])

  const addProfile = useCallback(
    (name, color) => {
      const trimmed = name.trim()
      if (!trimmed) return

      if (usingFallback) {
        setProfiles((prev) => [
          ...prev,
          { id: `p-${Date.now()}`, name: trimmed, avatar: '', color },
        ])
        return
      }

      // Optimistic: tampilkan dulu dengan id sementara, lalu ganti dengan
      // profil yang dikembalikan server.
      const tempId = `p-${Date.now()}`
      setProfiles((prev) => [...prev, { id: tempId, name: trimmed, avatar: '', color }])

      apiCreateProfile(trimmed, color)
        .then((profile) => {
          setProfiles((prev) => prev.map((item) => (item.id === tempId ? profile : item)))
        })
        .catch(() => {
          setProfiles((prev) => prev.filter((item) => item.id !== tempId))
        })
    },
    [usingFallback],
  )

  const removeProfile = useCallback(
    (id) => {
      setProfiles((prev) => {
        const next = prev.filter((profile) => profile.id !== id)
        return next.length > 0 ? next : prev
      })

      if (usingFallback) return

      apiDeleteProfile(id).catch(() => {
        // Gagal hapus di server — muat ulang daftar profil terkini.
        fetchProfiles()
          .then((list) => {
            if (Array.isArray(list) && list.length > 0) setProfiles(list)
          })
          .catch(() => {})
      })
    },
    [usingFallback],
  )

  return { profiles, loading, addProfile, removeProfile }
}
