import { useFetch } from '../hooks/useFetch.js'
import MovieCard from './MovieCard.jsx'

// Baris "Top 10 Hari Ini" khas Netflix: angka besar + poster.
export default function Top10Row({ onPlay, onInfo, isInMyList, onToggleMyList }) {
  const { data, loading, error } = useFetch('/trending/all/day')

  const items = (data?.results ?? [])
    .filter((movie) => movie.poster_path || movie.backdrop_path)
    .slice(0, 10)

  if (loading) {
    return (
      <section className="mb-8">
        <h3 className="mx-10 mb-3 text-[1.4rem] font-bold max-md:mx-5 max-md:mb-2">
          Top <span className="text-[#e50914]">10</span> Hari Ini
        </h3>
        <div className="flex gap-2.5 overflow-x-auto px-10 py-5 [&::-webkit-scrollbar]:hidden max-md:px-5 max-md:py-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex shrink-0 items-end"
            >
              <span className="-mr-8 select-none text-[8rem] font-black leading-none text-transparent [-webkit-text-stroke:3px_#595959] max-md:-mr-6 max-md:text-[6rem]">
                {i + 1}
              </span>
              <div className="h-[270px] w-[180px] shrink-0 animate-[shimmer_1.4s_infinite] rounded-md bg-[linear-gradient(90deg,#1f1f1f_25%,#2a2a2a_50%,#1f1f1f_75%)] bg-[length:200%_100%] max-md:h-[210px] max-md:w-[140px]" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="mb-8">
        <h3 className="mx-10 mb-3 text-[1.4rem] font-bold max-md:mx-5 max-md:mb-2">
          Top <span className="text-[#e50914]">10</span> Hari Ini
        </h3>
        <p className="px-10 text-[#b3b3b3] max-md:px-5">{error}</p>
      </section>
    )
  }

  if (items.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="mx-10 mb-3 text-[1.4rem] font-bold max-md:mx-5 max-md:mb-2">
        Top <span className="text-[#e50914]">10</span> Hari Ini
      </h3>
      <div className="flex gap-2.5 overflow-x-auto px-10 py-5 [scroll-behavior:smooth] [&::-webkit-scrollbar]:hidden max-md:px-5 max-md:py-4">
        {items.map((movie, index) => (
          <div key={movie.id} className="flex shrink-0 items-end">
            <span
              className="-mr-9 z-[1] select-none text-[8.5rem] font-black leading-none text-transparent [-webkit-text-stroke:3px_#b3b3b3] max-md:-mr-7 max-md:text-[6.5rem]"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <MovieCard
              movie={movie}
              onPlay={onPlay}
              onInfo={onInfo}
              isInMyList={isInMyList}
              onToggleMyList={onToggleMyList}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
