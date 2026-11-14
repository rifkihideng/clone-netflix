import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useProfiles } from '../hooks/useProfiles.js'

const COLORS = ['#e50914', '#0071eb', '#f5c518', '#46d369', '#8c4fd3', '#ff6b3d']

// Layar "Siapa yang menonton?" yang muncul setelah login.
export default function ProfileSelect({ user, onSelect }) {
  const { profiles, loading, addProfile, removeProfile } = useProfiles(user)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const handleAdd = (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    addProfile(trimmed, color)
    setName('')
    setColor(COLORS[0])
    setAdding(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#141414] px-6 py-12 text-white">
      <h1 className="mb-10 text-center text-[2.6rem] font-bold max-md:text-[2rem]">
        Siapa yang menonton?
      </h1>

      {loading && profiles.length === 0 && (
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-[#2a2a2a] border-t-[#e50914]"
          role="status"
          aria-label="Memuat profil"
        />
      )}

      <div className="flex flex-wrap items-start justify-center gap-6">
        {profiles.map((profile) => (
          <div key={profile.id} className="group relative flex flex-col items-center">
            <button
              type="button"
              className="relative flex h-[120px] w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-md ring-1 ring-white/10 transition-all duration-200 hover:scale-[1.06] hover:ring-white/60 max-md:h-[100px] max-md:w-[100px]"
              onClick={() => onSelect(profile)}
              aria-label={`Masuk sebagai ${profile.name}`}
            >
              {profile.avatar ? (
                <img
                  className="h-full w-full object-cover"
                  src={profile.avatar}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center text-5xl font-black"
                  style={{ backgroundColor: profile.color }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <span className="mt-3 text-base text-[#b3b3b3] group-hover:text-white">{profile.name}</span>

            {profiles.length > 1 && profile.id !== 'github' && (
              <button
                type="button"
                className="absolute -right-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[#1d1d1d] text-[#b3b3b3] ring-1 ring-[#2c2f36]/50 opacity-0 transition-opacity duration-200 hover:text-white group-hover:opacity-100"
                aria-label={`Hapus profil ${profile.name}`}
                onClick={() => removeProfile(profile.id)}
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        <div className="flex flex-col items-center">
          <button
            type="button"
            className="flex h-[120px] w-[120px] cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-[#5a5a5a] text-[#5a5a5a] transition-all duration-200 hover:scale-[1.06] hover:border-white hover:text-white max-md:h-[100px] max-md:w-[100px]"
            onClick={() => setAdding(true)}
            aria-label="Tambah profil"
          >
            <Plus size={44} />
          </button>
          <span className="mt-3 text-base text-[#b3b3b3]">Tambah Profil</span>
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            className="w-full max-w-sm rounded-lg bg-[#1d1d1d] p-6"
            onSubmit={handleAdd}
          >
            <h2 className="mb-4 text-xl font-bold">Tambah Profil</h2>

            <label className="mb-1 block text-sm text-[#b3b3b3]" htmlFor="profile-name">
              Nama
            </label>
            <input
              id="profile-name"
              className="mb-4 w-full rounded-md border border-[#3a3a3a] bg-[#141414] px-3 py-2.5 text-sm text-white outline-none focus:border-white"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nama profil"
              autoFocus
              maxLength={20}
            />

            <p className="mb-2 text-sm text-[#b3b3b3]">Warna</p>
            <div className="mb-6 flex gap-2.5">
              {COLORS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`h-9 w-9 cursor-pointer rounded-full transition-transform duration-150 ${
                    color === item ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#1d1d1d]' : ''
                  }`}
                  style={{ backgroundColor: item }}
                  onClick={() => setColor(item)}
                  aria-label={`Warna ${item}`}
                />
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="cursor-pointer rounded bg-transparent px-4 py-2 text-sm font-semibold text-[#b3b3b3] transition-colors hover:text-white"
                onClick={() => setAdding(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-white/80"
                disabled={!name.trim()}
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
