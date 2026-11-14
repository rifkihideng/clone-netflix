import MovieCard from './MovieCard.jsx'

// Baris "Lanjutkan Menonton" yang menampilkan riwayat tontonan terbaru.
export default function WatchHistoryRow({ items, onPlay, onInfo, onRemove }) {
  if (!items || items.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="mx-10 mb-3 text-[1.4rem] font-bold max-md:mx-5 max-md:mb-2">Lanjutkan Menonton</h3>
      <div className="flex gap-2.5 overflow-x-auto px-10 py-5 [scroll-behavior:smooth] [&::-webkit-scrollbar]:hidden max-md:px-5 max-md:py-4">
        {items.map((movie) => {
          const duration = Number(movie.duration)
          const progressSeconds = Number(movie.progress_seconds)
          const progress = duration > 0 ? progressSeconds / duration : 0

          return (
            <MovieCard
              key={movie.id}
              movie={movie}
              onPlay={onPlay}
              onInfo={onInfo}
              onRemove={(item) => onRemove(item.id)}
              progress={progress}
            />
          )
        })}
      </div>
    </section>
  )
}
