// Identitas dan profil untuk mode "Masuk sebagai Tamu" (tanpa OAuth GitHub).
// Sesi tamu disimpan di sessionStorage; data Daftar Saya & riwayat tontonan
// tamu disimpan di localStorage (key `netflix-clone-*:guest`).

export const GUEST_STORAGE_KEY = 'netflix-clone-guest'

export const GUEST_USER = Object.freeze({
  id: 'guest',
  login: 'tamu',
  name: 'Tamu',
  avatar_url: null,
})

export const GUEST_PROFILE = Object.freeze({
  id: 'guest',
  name: 'Tamu',
  avatar: '',
  color: '#e50914',
})

export function isGuest(user) {
  return user?.id === 'guest'
}

export function readGuestFlag() {
  try {
    return sessionStorage.getItem(GUEST_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setGuestFlag() {
  try {
    sessionStorage.setItem(GUEST_STORAGE_KEY, '1')
  } catch {
    // Storage diblokir — mode tamu tetap aktif untuk sesi ini.
  }
}

export function clearGuestFlag() {
  try {
    sessionStorage.removeItem(GUEST_STORAGE_KEY)
  } catch {
    // Abaikan.
  }
}
