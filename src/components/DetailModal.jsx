import { useEffect, useState } from 'react'
import { Check, Play, Plus, X } from 'lucide-react'
import { IMG_BASE_URL, fetchFromTMDB } from '../api.js'
import { useFetch } from '../hooks/useFetch.js'
import { getMediaType, getYear } from '../lib/movie.js'

const MAX_CAST = 12
const MAX_SIMILAR = 12

// Modal detail film/serial: sinopsis lengkap, meta, pemeran, dan "Film Serupa".
export default function DetailModal({ movie, onClose, onPlay, onSelect, isInMyList, onToggleMyList }) {
  const mediaType = getMediaType(movie)
  const detailsEndpoint = `/${mediaType}/${movie.id}`
  const creditsEndpoint = `/${mediaType}/${movie.id}/credits`
  const similarEndpoint = `/${mediaType}/${movie.id}/similar`

  const { data: details } = useFetch(detailsEndpoint)
  const { data: credits } = useFetch(creditsEndpoint)
  const { data: similar, loading: similarLoading, error: similarError } = useFetch(similarEndpoint)

  // Fallback sinopsis bila versi bahasa Indonesia kosong.
  const [fallbackDetails, setFallbackDetails] = useState(null)
  useEffect(() => {
    if (!details || details.overview) return
    let cancelled = false
    fetchFromTMDB(detailsEndpoint, { language: '' })
      .then((data) => {
        if (!cancelled) setFallbackDetails(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details])

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

  const title = movie.title || movie.name || movie.original_name || ''
  const detailSource = details?.overview ? details : fallbackDetails
  const overview = detailSource?.overview || movie.overview || 'Sinopsis tidak tersedia.'
  const genres = detailSource?.genres?.map((genre) => genre.name) ?? []
  const cast = (credits?.cast ?? []).slice(0, MAX_CAST)
  const rating = detailSource?.vote_average ?? movie.vote_average
  const ratingLabel = rating ? Math.round(rating * 10) / 10 : '—'
  const year = detailSource?.release_date || detailSource?.first_air_date
    ? String(detailSource.release_date || detailSource.first_air_date).slice(0, 4)
    : getYear(movie)
  const runtime = detailSource?.runtime
  const seasons = detailSource?.number_of_seasons
  const inList = isInMyList?.(movie.id) ?? false

  const backdropPath = detailSource?.backdrop_path || movie.backdrop_path
  const backdrop = backdropPath ? `${IMG_BASE_URL}/original${backdropPath}` : ''

  const similarItems = (similar?.results ?? [])
    .filter((item) => item.poster_path || item.backdrop_path)
    .slice(0, MAX_SIMILAR)

  return (
    <div
      className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/85 p-6 backdrop-blur-[2px] max-md:p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detail ${title}`}
    >
      <div
        className="relative my-auto w-full max-w-[960px] overflow-hidden rounded-xl bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-md:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 z-[3] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[rgba(20,20,20,0.8)] text-white transition-colors duration-200 hover:bg-[#141414]"
          type="button"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X size={24} />
        </button>

        <div
          className="relative flex h-[380px] items-end bg-cover bg-center p-8 max-md:h-[300px] max-md:p-5"
          style={
            backdrop
              ? {
                  backgroundImage: `linear-gradient(to top, #141414 0%, transparent 70%), url(${backdrop})`,
                }
              : undefined
          }
        >
          <div className="relative z-[2] max-w-[620px]">
            <h2 className="mb-2 text-4xl font-extrabold [text-shadow:2px_2px_8px_rgba(0,0,0,0.7)] max-md:text-2xl">
              {title}
            </h2>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#e5e5e5]">
              {year && <span className="font-semibold text-[#46d369]">{year}</span>}
              {runtime && <span>{runtime} menit</span>}
              {seasons && <span>{seasons} musim</span>}
              <span className="font-bold text-[#f5c518]">⭐ {ratingLabel}</span>
            </div>
            <div className="flex gap-3">
              <button
                className="flex cursor-pointer items-center gap-2 rounded bg-white px-6 py-2.5 text-base font-bold text-black transition-colors duration-200 hover:bg-white/75"
                type="button"
                onClick={() => onPlay(movie)}
              >
                <Play size={20} fill="currentColor" />
                Putar
              </button>
              {onToggleMyList && (
                <button
                  className="flex cursor-pointer items-center gap-2 rounded bg-[rgba(109,109,110,0.7)] px-6 py-2.5 text-base font-bold text-white transition-colors duration-200 hover:bg-[rgba(109,109,110,0.4)]"
                  type="button"
                  onClick={() => onToggleMyList(movie)}
                >
                  {inList ? <Check size={20} /> : <Plus size={20} />}
                  {inList ? 'Tersimpan' : 'Daftar Saya'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 max-md:px-5 max-md:pb-6">
          {genres.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[0.85rem] font-semibold text-[#b3b3b3]">
              {mediaType === 'tv' ? 'Serial' : 'Film'}
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-white/25 px-2.5 py-0.5 font-medium text-[#e5e5e5]"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          <p className="max-w-[720px] leading-6 text-[#b3b3b3]">{overview}</p>

          {cast.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-base font-bold">Pemeran</h3>
              <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-3">
                {cast.map((person) => (
                  <li key={person.id} className="flex flex-col items-center gap-1.5 text-center">
                    {person.profile_path ? (
                      <img
                        className="h-[68px] w-[68px] rounded-full bg-[#2a2a2a] object-cover"
                        src={`${IMG_BASE_URL}/w185${person.profile_path}`}
                        alt={person.name}
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#2a2a2a] text-2xl font-bold text-[#e5e5e5]">
                        {person.name?.charAt(0) ?? '?'}
                      </span>
                    )}
                    <span className="text-xs leading-tight text-[#d4d4d4]">{person.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {similarItems.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-base font-bold">Film Serupa</h3>
              <div className="flex gap-2.5 overflow-x-auto [scroll-behavior:smooth] [&::-webkit-scrollbar]:hidden">
                {similarItems.map((item) => {
                  const itemName = item.title || item.name || item.original_name || ''
                  const itemPoster = item.poster_path || item.backdrop_path
                  const itemRating = item.vote_average ? Math.round(item.vote_average * 10) / 10 : '—'
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="group/item relative w-[150px] shrink-0 cursor-pointer rounded-md border-none bg-transparent p-0 text-left max-md:w-[120px]"
                      onClick={() => onSelect?.(item)}
                    >
                      <img
                        className="aspect-[2/3] w-full rounded-md bg-[#333] object-cover"
                        src={`${IMG_BASE_URL}/w342${itemPoster}`}
                        alt={itemName}
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 rounded-b-md bg-[linear-gradient(to_top,rgba(0,0,0,0.9),transparent)] p-2.5 opacity-0 transition-opacity duration-300 group-hover/item:opacity-100">
                        <p className="mb-0.5 text-xs font-semibold text-white">{itemName}</p>
                        <p className="text-[11px] text-[#f5c518]">⭐ {itemRating}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {similarError && (
            <p className="mt-6 text-sm text-[#b3b3b3]">{similarError}</p>
          )}
          {similarLoading && (
            <div className="mt-6 flex gap-2.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] w-[150px] shrink-0 animate-[shimmer_1.4s_infinite] rounded-md bg-[linear-gradient(90deg,#1f1f1f_25%,#2a2a2a_50%,#1f1f1f_75%)] bg-[length:200%_100%] max-md:w-[120px]"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
