import { useEffect, useRef, useState } from 'react'
import { Check, Plus, Volume2, VolumeX, X } from 'lucide-react'
import { IMG_BASE_URL } from '../api.js'
import { useFetch } from '../hooks/useFetch.js'

// Jumlah maksimal pemeran yang ditampilkan di modal.
const MAX_CAST = 12

// Cari video YouTube yang cocok: utamakan Trailer, lalu Teaser, lalu video lain.
function getVideoKey(videos) {
  const results = videos?.results ?? []
  const match =
    results.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    results.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
    results.find((v) => v.site === 'YouTube')
  return match?.key ?? null
}

// Tentukan tipe media: serial (tv) atau film (movie). Endpoint khusus film
// (mis. top_rated/discover) tidak menyertakan media_type, jadi pakai title/name.
function getMediaType(movie) {
  if (movie.media_type === 'tv' || movie.media_type === 'movie') return movie.media_type
  return movie.name && !movie.title ? 'tv' : 'movie'
}

export default function PlayerModal({ movie, onClose, inMyList, onToggleMyList, onProgress }) {
  const mediaType = getMediaType(movie)

  const videosEndpoint = `/${mediaType}/${movie.id}/videos`
  const detailsEndpoint = `/${mediaType}/${movie.id}`
  const creditsEndpoint = `/${mediaType}/${movie.id}/credits`

  // language '' = semua bahasa, supaya trailer Inggris/tetap muncul.
  const { data: videos, loading: videosLoading, error: videosError } = useFetch(
    videosEndpoint,
    { language: '' },
  )
  // Detail & kredit dipakai untuk sinopsis lengkap + daftar pemeran.
  const { data: details } = useFetch(detailsEndpoint)
  const { data: credits } = useFetch(creditsEndpoint)

  const iframeRef = useRef(null)
  // Mulai dalam keadaan bisu supaya autoplay diizinkan browser.
  const [muted, setMuted] = useState(true)

  // Progres tontonan dilaporkan ke parent untuk fitur "Lanjutkan Menonton".
  const progressRef = useRef({ currentTime: 0, duration: 0 })
  const lastReportedRef = useRef(0)
  const onProgressRef = useRef(onProgress)
  const movieRef = useRef(movie)

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  // Mulai dari posisi terakhir bila ada riwayat tontonan.
  const startAt = Math.max(0, Math.floor(Number(movie.progress_seconds) || 0))

  const title = movie.title || movie.name || movie.original_name
  const rating = movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null
  const videoKey = getVideoKey(videos)

  // Sinopsis: utamakan dari endpoint detail (lebih lengkap), fallback ke data list.
  const overview = details?.overview || movie.overview || ''
  const genres = details?.genres?.slice(0, 3).map((genre) => genre.name) ?? []
  const cast = (credits?.cast ?? []).slice(0, MAX_CAST)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      // Simpan posisi terakhir saat modal ditutup.
      const { currentTime, duration } = progressRef.current
      if (duration > 0 && currentTime > 0) {
        onProgressRef.current?.(movieRef.current, Math.floor(currentTime), Math.floor(duration))
      }
    }
  }, [onClose])

  // Terima info currentTime/duration dari player YouTube (postMessage API).
  useEffect(() => {
    const onMessage = (event) => {
      let payload
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }
      if (payload?.event === 'infoDelivery' && payload?.info) {
        const { currentTime, duration } = payload.info
        if (typeof currentTime === 'number') progressRef.current.currentTime = currentTime
        if (typeof duration === 'number') progressRef.current.duration = duration

        // Laporkan progres bertahap (tiap loncat ~5 detik).
        if (progressRef.current.duration > 0) {
          const rounded = Math.floor(progressRef.current.currentTime)
          if (Math.abs(rounded - lastReportedRef.current) >= 5) {
            lastReportedRef.current = rounded
            onProgressRef.current?.(
              movieRef.current,
              rounded,
              Math.floor(progressRef.current.duration),
            )
          }
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Polling posisi tontonan secara berkala.
  useEffect(() => {
    if (!videoKey) return
    const timer = setInterval(() => {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
        '*',
      )
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'getDuration', args: [] }),
        '*',
      )
    }, 5000)
    return () => clearInterval(timer)
  }, [videoKey])

  // Kirim perintah mute/unmute ke player YouTube (tanpa reload video).
  const sendPlayerCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*',
    )
  }

  // Aktifkan mode "listening" supaya player mengirim info currentTime/duration.
  const setupPlayer = () => {
    sendPlayerCommand(muted ? 'mute' : 'unMute')
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'listening', id: 0, channel: 'widget' }),
        '*',
      )
    }
  }

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev
      sendPlayerCommand(next ? 'mute' : 'unMute')
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/85 p-6 backdrop-blur-[2px] max-md:p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Putar ${title}`}
    >
      <div
        className="relative my-auto w-full max-w-[900px] overflow-hidden rounded-xl bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-md:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-3 top-3 z-[2] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[rgba(20,20,20,0.8)] text-white transition-colors duration-200 hover:bg-[#141414]"
          type="button"
          onClick={onClose}
          aria-label="Tutup"
        >
          <X size={24} />
        </button>

        <div className="relative flex aspect-video items-center justify-center bg-black">
          {videosLoading && <p className="p-6 text-center text-[#b3b3b3]">Memuat trailer...</p>}

          {videosError && <p className="p-6 text-center text-[#b3b3b3]">{videosError}</p>}

          {!videosLoading && !videosError && videoKey && (
            <iframe
              ref={iframeRef}
              className="h-full w-full border-none"
              src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&rel=0&enablejsapi=1${startAt > 0 ? `&start=${startAt}` : ''}`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={setupPlayer}
            />
          )}

          {!videosLoading && !videosError && !videoKey && (
            <p className="p-6 text-center text-[#b3b3b3]">
              Trailer untuk “{title}” tidak tersedia.
            </p>
          )}
        </div>

        <div className="px-6 pb-6 pt-5 max-md:p-4">
          <div className="mb-2.5 flex items-center gap-3.5 max-md:flex-wrap max-md:gap-2.5">
            <h2 className="flex-1 text-2xl font-bold max-md:basis-full max-md:text-xl">{title}</h2>
            {rating != null && (
              <span className="whitespace-nowrap font-bold text-[#f5c518]">⭐ {rating}</span>
            )}
            {onToggleMyList && (
              <button
                className="flex cursor-pointer items-center gap-2 rounded bg-[rgba(109,109,110,0.7)] px-4 py-[9px] font-bold text-white transition-colors duration-200 hover:bg-[rgba(109,109,110,0.5)]"
                type="button"
                onClick={onToggleMyList}
                aria-label={
                  inMyList ? `Hapus ${title} dari Daftar Saya` : `Tambah ${title} ke Daftar Saya`
                }
              >
                {inMyList ? <Check size={22} /> : <Plus size={22} />}
                <span>{inMyList ? 'Tersimpan' : 'Daftar Saya'}</span>
              </button>
            )}
            {videoKey && (
              <button
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[rgba(109,109,110,0.7)] text-white transition-colors duration-200 hover:bg-[rgba(109,109,110,0.5)]"
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Nyalakan suara' : 'Bisukan'}
              >
                {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
            )}
          </div>

          {genres.length > 0 && (
            <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[0.85rem] font-semibold text-[#b3b3b3]">
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

          <p className="leading-6 text-[#b3b3b3]">{overview || 'Sinopsis tidak tersedia.'}</p>

          {cast.length > 0 && (
            <div className="mt-[18px]">
              <h3 className="mb-2.5 text-base font-bold">Pemeran</h3>
              <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-3">
                {cast.map((person) => (
                  <li key={person.id} className="flex flex-col items-center gap-1.5 text-center">
                    {person.profile_path ? (
                      <img
                        className="h-[72px] w-[72px] rounded-full bg-[#2a2a2a] object-cover"
                        src={`${IMG_BASE_URL}/w185${person.profile_path}`}
                        alt={person.name}
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#2a2a2a] text-2xl font-bold text-[#e5e5e5]">
                        {person.name?.charAt(0) ?? '?'}
                      </span>
                    )}
                    <span className="text-xs leading-tight text-[#d4d4d4]">{person.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
