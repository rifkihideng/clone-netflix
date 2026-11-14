import { useEffect, useState } from 'react'
import { Check, Info, Plus, X } from 'lucide-react'
import { IMG_BASE_URL } from '../api.js'
import { usePaginatedFetch } from '../hooks/usePaginatedFetch.js'
import { getYear } from '../lib/movie.js'

// Daftar genre film TMDB (ID stabil) dengan label Indonesia.
const GENRES = [
  { id: 28, name: 'Aksi' },
  { id: 12, name: 'Petualangan' },
  { id: 16, name: 'Animasi' },
  { id: 35, name: 'Komedi' },
  { id: 80, name: 'Kriminal' },
  { id: 99, name: 'Dokumenter' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Keluarga' },
  { id: 14, name: 'Fantasi' },
  { id: 36, name: 'Sejarah' },
  { id: 27, name: 'Horor' },
  { id: 10402, name: 'Musik' },
  { id: 9648, name: 'Misteri' },
  { id: 10749, name: 'Romantis' },
  { id: 878, name: 'Fiksi Ilmiah' },
  { id: 10770, name: 'Film TV' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'Perang' },
  { id: 37, name: 'Barat' },
]

// Jelajah film berdasarkan genre (overlay layar penuh).
export default function GenreBrowse({ onClose, onPlay, onInfo, isInMyList, onToggleMyList }) {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const activeGenre = GENRES.find((genre) => genre.id === selected)

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-[#141414]" role="dialog" aria-modal="true" aria-label="Jelajah genre">
      <header className="sticky top-0 z-[2] flex items-center justify-between gap-4 border-b border-[#2a2a2a] bg-[#141414]/95 px-8 py-4 backdrop-blur max-md:px-5">
        <h2 className="text-xl font-bold">Jelajah Genre</h2>
        <button
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#1d1d1d] text-white ring-1 ring-[#2c2f36]/50 transition-colors duration-200 hover:bg-[#2a2a2a]"
          type="button"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X size={20} />
        </button>
      </header>

      <div className="px-8 pb-10 pt-5 max-md:px-5">
        <div className="mb-6 flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre.id}
              type="button"
              className={`cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                selected === genre.id
                  ? 'bg-white text-black'
                  : 'bg-[#1d1d1d] text-[#b3b3b3] ring-1 ring-[#2c2f36]/50 hover:text-white'
              }`}
              onClick={() => setSelected(genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </div>

        {!activeGenre ? (
          <p className="py-16 text-center text-[#b3b3b3]">Pilih genre untuk mulai menjelajah.</p>
        ) : (
          <>
            <h3 className="mb-5 text-lg font-semibold">{activeGenre.name}</h3>
            <GenreGrid
              genreId={activeGenre.id}
              onPlay={onPlay}
              onInfo={onInfo}
              isInMyList={isInMyList}
              onToggleMyList={onToggleMyList}
            />
          </>
        )}
      </div>
    </div>
  )
}

function GenreGrid({ genreId, onPlay, onInfo, isInMyList, onToggleMyList }) {
  const { items, loading, loadingMore, moreError, error, hasMore, loadMore } = usePaginatedFetch(
    '/discover/movie',
    { with_genres: genreId },
  )

  const results = items.filter((item) => item.poster_path || item.backdrop_path)

  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-6 max-md:grid-cols-[repeat(auto-fill,minmax(120px,1fr))] max-md:gap-x-3 max-md:gap-y-4">
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] animate-[shimmer_1.4s_infinite] rounded-md bg-[linear-gradient(90deg,#1f1f1f_25%,#2a2a2a_50%,#1f1f1f_75%)] bg-[length:200%_100%]"
            />
          ))}

        {error && <p className="col-span-full py-6 text-[#b3b3b3]">{error}</p>}

        {!loading && !error && results.length === 0 && (
          <p className="col-span-full py-6 text-[#b3b3b3]">Tidak ada film di genre ini.</p>
        )}

        {!loading &&
          !error &&
          results.map((item) => {
            const name = item.title || item.name || item.original_name || ''
            const posterPath = item.poster_path || item.backdrop_path
            const year = getYear(item)
            const rating = item.vote_average ? Math.round(item.vote_average * 10) / 10 : '—'
            const inList = isInMyList?.(item.id) ?? false

            return (
              <div
                key={item.id}
                className="group relative cursor-pointer transition-transform duration-300 hover:z-[2] hover:scale-[1.06]"
                role="button"
                tabIndex={0}
                onClick={() => onPlay(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onPlay(item)
                  }
                }}
              >
                <img
                  className="aspect-[2/3] w-full rounded-md bg-[#333] object-cover"
                  src={`${IMG_BASE_URL}/w342${posterPath}`}
                  alt={name}
                  loading="lazy"
                />
                <div className="pointer-events-none absolute left-1.5 top-1.5 flex gap-1">
                  <span className="rounded bg-[rgba(20,20,20,0.75)] px-1.5 py-0.5 text-[10px] font-semibold text-[#e5e5e5]">
                    Film
                  </span>
                  {year && (
                    <span className="rounded bg-[rgba(20,20,20,0.75)] px-1.5 py-0.5 text-[10px] font-semibold text-[#e5e5e5]">
                      {year}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 rounded-b-md bg-[linear-gradient(to_top,rgba(0,0,0,0.9),transparent)] p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="mb-1 pr-2 text-sm font-semibold">{name}</p>
                  <p className="text-xs text-[#f5c518]">⭐ {rating}</p>

                  {onInfo && (
                    <button
                      className="absolute left-2 top-2 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-[rgba(20,20,20,0.85)] text-white transition-colors duration-200 hover:bg-[#141414]"
                      type="button"
                      aria-label={`Info ${name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onInfo(item)
                      }}
                    >
                      <Info size={16} />
                    </button>
                  )}

                  {onToggleMyList && (
                    <button
                      className="absolute right-2 top-2 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-[rgba(20,20,20,0.85)] text-white transition-colors duration-200 hover:bg-[#141414]"
                      type="button"
                      aria-label={inList ? `Hapus ${name} dari Daftar Saya` : `Tambah ${name} ke Daftar Saya`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onToggleMyList(item)
                      }}
                    >
                      {inList ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {!loading && !error && hasMore && (
        <button
          className="col-span-full mx-auto mt-6 block rounded-md border border-white/25 bg-transparent px-7 py-3 text-[0.95rem] font-semibold text-white transition-colors duration-200 hover:border-white/50 hover:bg-white/10 disabled:cursor-default disabled:opacity-50"
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Memuat...' : moreError ? 'Coba lagi' : 'Muat Lebih Banyak'}
        </button>
      )}
    </div>
  )
}
