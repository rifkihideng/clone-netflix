import { useEffect, useRef, useState } from 'react'
import { Check, Plus, Volume2, VolumeX, X } from 'lucide-react'
import './PlayerModal.css'
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
      className="modal"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Putar ${title}`}
    >
      <div className="modal__panel" onClick={(event) => event.stopPropagation()}>
        <button className="modal__close" type="button" onClick={onClose} aria-label="Tutup">
          <X size={24} />
        </button>

        <div className="modal__video">
          {videosLoading && <p className="modal__status">Memuat trailer...</p>}

          {videosError && <p className="modal__status">{videosError}</p>}

          {!videosLoading && !videosError && videoKey && (
            <iframe
              ref={iframeRef}
              className="modal__iframe"
              src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&rel=0&enablejsapi=1${startAt > 0 ? `&start=${startAt}` : ''}`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={setupPlayer}
            />
          )}

          {!videosLoading && !videosError && !videoKey && (
            <p className="modal__status">Trailer untuk “{title}” tidak tersedia.</p>
          )}
        </div>

        <div className="modal__info">
          <div className="modal__header">
            <h2 className="modal__title">{title}</h2>
            {rating != null && <span className="modal__rating">⭐ {rating}</span>}
            {onToggleMyList && (
              <button
                className="modal__list"
                type="button"
                onClick={onToggleMyList}
                aria-label={inMyList ? `Hapus ${title} dari Daftar Saya` : `Tambah ${title} ke Daftar Saya`}
              >
                {inMyList ? <Check size={22} /> : <Plus size={22} />}
                <span>{inMyList ? 'Tersimpan' : 'Daftar Saya'}</span>
              </button>
            )}
            {videoKey && (
              <button
                className="modal__mute"
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Nyalakan suara' : 'Bisukan'}
              >
                {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
            )}
          </div>

          {genres.length > 0 && (
            <div className="modal__genres">
              {mediaType === 'tv' ? 'Serial' : 'Film'}
              {genres.map((genre) => (
                <span key={genre} className="modal__genre">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <p className="modal__overview">{overview || 'Sinopsis tidak tersedia.'}</p>

          {cast.length > 0 && (
            <div className="modal__cast">
              <h3 className="modal__cast-title">Pemeran</h3>
              <ul className="modal__cast-list">
                {cast.map((person) => (
                  <li key={person.id} className="modal__cast-item">
                    {person.profile_path ? (
                      <img
                        className="modal__cast-avatar"
                        src={`${IMG_BASE_URL}/w185${person.profile_path}`}
                        alt={person.name}
                        loading="lazy"
                      />
                    ) : (
                      <span className="modal__cast-avatar modal__cast-avatar--placeholder">
                        {person.name?.charAt(0) ?? '?'}
                      </span>
                    )}
                    <span className="modal__cast-name">{person.name}</span>
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
