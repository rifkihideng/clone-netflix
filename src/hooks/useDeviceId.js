import { useState } from 'react'

const DEVICE_KEY = 'netflix-clone-device-id'

// Buat/ambil ID perangkat yang unik per browser. Dipakai sebagai "user"
// tanpa login supaya Daftar Saya & riwayat tersimpan per perangkat.
function loadDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    // localStorage diblokir — fallback ke ID sesi acak.
    return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export function useDeviceId() {
  const [deviceId] = useState(loadDeviceId)
  return deviceId
}
