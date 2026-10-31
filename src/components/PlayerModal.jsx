import { useEffect, useRef, useState } from 'react'
import { Check, Plus, Volume2, VolumeX, X } from 'lucide-react'
import './PlayerModal.css'
import { useFetch } from '../hooks/useFetch.js'

// Cari video YouTube yang cocok: utamakan Trailer, lalu Teaser, lalu video lain.
function getVideoKey(videos) {
  const results = videos?.results ?? []
  const match =
    results.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    results.find((v) => v.site === 'YouTube' && v.type === 'Teaser') ||
    results.find((v) => v.site === 'YouTube')
  return match?.key ?? null
}

export default function PlayerModal({ movie, onClose, inMyList, onToggleMyList }) {
  const endpoint =
    movie.media_type === 'tv' ? `/tv/${movie.id}/videos` : `/movie/${movie.id}/videos`
  // language '' = semua bahasa, supaya trailer Inggris/tetap muncul.
  const { data, loading, error } = useFetch(endpoint, { language: '' })

  const iframeRef = useRef(null)
  const [muted, setMuted] = useState(false)

  const title = movie.title || movie.name || movie.original_name
  const rating = movie.vote_average ? Math.round(movie.vote_average * 10) / 10 : null
  const videoKey = getVideoKey(data)

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

  // Kirim perintah mute/unmute ke player YouTube (tanpa reload video).
  const sendPlayerCommand = (func) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*',
    )
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
          {loading && <p className="modal__status">Memuat trailer...</p>}

          {error && <p className="modal__status">{error}</p>}

          {!loading && !error && videoKey && (
            <iframe
              ref={iframeRef}
              className="modal__iframe"
              src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&enablejsapi=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              onLoad={() => sendPlayerCommand(muted ? 'mute' : 'unMute')}
            />
          )}

          {!loading && !error && !videoKey && (
            <p className="modal__status">Trailer untuk “{title}” tidak tersedia.</p>
          )}
        </div>

        {!loading && !error && (
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
            <p className="modal__overview">{movie.overview || 'Sinopsis tidak tersedia.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
