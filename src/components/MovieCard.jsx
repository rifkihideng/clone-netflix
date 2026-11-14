import { useEffect, useRef, useState } from 'react'
import { Check, Info, Plus, X } from 'lucide-react'
import { IMG_BASE_URL, fetchFromTMDB } from '../api.js'
import { getMediaType, getVideoKey, getYear } from '../lib/movie.js'

// Jeda sebelum pratinjau trailer muncul saat kursor diam di atas kartu.
const HOVER_DELAY = 600

// Kartu film/serial: poster + badge info + pratinjau trailer saat hover.
// `onRemove` menampilkan tombol hapus (Daftar Saya/riwayat); `progress`
// menampilkan bilah progres tontonan (0..1).
export default function MovieCard({
  movie,
  large = false,
  onPlay,
  onInfo,
  isInMyList,
  onToggleMyList,
  onRemove,
  progress,
}) {
  const [preview, setPreview] = useState(false)
  const [videoKey, setVideoKey] = useState(null)
  const [videoFetched, setVideoFetched] = useState(false)
  const timerRef = useRef(null)

  const name = movie.title || movie.name || movie.original_name || ''
  const posterPath = movie.poster_path || movie.backdrop_path
  const mediaType = getMediaType(movie)
  const typeLabel = mediaType === 'tv' ? 'Serial' : 'Film'
  const year = getYear(movie)
  const rating = movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : '—'
  const inList = isInMyList?.(movie.id) ?? false

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handleEnter = () => {
    clearTimer()
    timerRef.current = setTimeout(() => setPreview(true), HOVER_DELAY)
  }

  const handleLeave = () => {
    clearTimer()
    setPreview(false)
  }

  useEffect(() => () => clearTimer(), [])

  // Ambil trailer sekali saja saat pratinjau pertama kali diminta.
  useEffect(() => {
    if (!preview || videoFetched) return
    let cancelled = false
    fetchFromTMDB(`/${mediaType}/${movie.id}/videos`, { language: '' })
      .then((data) => {
        if (!cancelled) setVideoKey(getVideoKey(data))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setVideoFetched(true)
      })
    return () => {
      cancelled = true
    }
  }, [preview, videoFetched, mediaType, movie.id])

  if (!posterPath) return null

  return (
    <div
      className={`group relative z-[1] shrink-0 cursor-pointer transition-transform duration-300 hover:z-[2] hover:scale-[1.12] ${
        large ? 'w-[220px] max-md:w-[160px]' : 'w-[180px] max-md:w-[140px]'
      }`}
      title={name}
      role="button"
      tabIndex={0}
      onClick={() => onPlay(movie)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onPlay(movie)
        }
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-[#333]">
        {preview && videoKey ? (
          <iframe
            className="pointer-events-none absolute inset-0 h-full w-full border-none"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&rel=0&playsinline=1&loop=1&playlist=${videoKey}`}
            title={`Pratinjau ${name}`}
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        ) : (
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={`${IMG_BASE_URL}/${large ? 'w500' : 'w342'}${posterPath}`}
            alt={name}
            loading="lazy"
          />
        )}

        <div className="pointer-events-none absolute left-1.5 top-1.5 flex gap-1">
          <span className="rounded bg-[rgba(20,20,20,0.75)] px-1.5 py-0.5 text-[10px] font-semibold text-[#e5e5e5]">
            {typeLabel}
          </span>
          {year && (
            <span className="rounded bg-[rgba(20,20,20,0.75)] px-1.5 py-0.5 text-[10px] font-semibold text-[#e5e5e5]">
              {year}
            </span>
          )}
        </div>
      </div>

      {onRemove && (
        <button
          className="absolute right-2 top-2 z-[2] hidden h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-[rgba(20,20,20,0.85)] text-white transition-colors duration-200 hover:bg-[#141414] group-hover:flex max-md:flex"
          type="button"
          aria-label={`Hapus ${name}`}
          onClick={(event) => {
            event.stopPropagation()
            onRemove(movie)
          }}
        >
          <X size={16} />
        </button>
      )}

      {typeof progress === 'number' && progress > 0 && progress < 1 && (
        <div
          className="absolute bottom-0 left-0 right-0 z-[3] h-1 overflow-hidden rounded-b-md bg-white/25"
          aria-hidden="true"
        >
          <span
            className="block h-full bg-[#e50914]"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 rounded-b-md bg-[linear-gradient(to_top,rgba(0,0,0,0.9),transparent)] p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="mb-1 pr-2 text-sm font-semibold">{name}</p>
        <p className="text-xs text-[#f5c518]">⭐ {rating}</p>

        {onInfo && (
          <button
            className="absolute left-2 top-2 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-[rgba(20,20,20,0.85)] text-white transition-colors duration-200 hover:bg-[#141414]"
            type="button"
            aria-label={`Info ${name}`}
            title="Info"
            onClick={(event) => {
              event.stopPropagation()
              onInfo(movie)
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
              onToggleMyList(movie)
            }}
          >
            {inList ? <Check size={16} /> : <Plus size={16} />}
          </button>
        )}
      </div>
    </div>
  )
}
