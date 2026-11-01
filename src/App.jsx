import { useEffect, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import Banner from './components/Banner.jsx'
import Row from './components/Row.jsx'
import SearchResults from './components/SearchResults.jsx'
import Footer from './components/Footer.jsx'
import PlayerModal from './components/PlayerModal.jsx'
import MyListRow from './components/MyListRow.jsx'
import WatchHistoryRow from './components/WatchHistoryRow.jsx'
import NetflixLoader from './components/NetflixLoader.jsx'
import { useMyList } from './hooks/useMyList.js'
import { useWatchHistory } from './hooks/useWatchHistory.js'
import { requests } from './api.js'

export default function App() {
  const [showNavBg, setShowNavBg] = useState(false)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [playing, setPlaying] = useState(null)
  const [firstLoaded, setFirstLoaded] = useState(false)
  const { items: myList, isInList, toggle: toggleMyList } = useMyList()
  const { items: historyItems, record: recordWatch } = useWatchHistory()

  useEffect(() => {
    const onScroll = () => setShowNavBg(window.scrollY > 100)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Pengaman: jangan biarkan splash menggantung lebih dari 8 detik.
  useEffect(() => {
    const safetyTimer = setTimeout(() => setFirstLoaded(true), 8000)
    return () => clearTimeout(safetyTimer)
  }, [])

  const handleSearch = (rawQuery) => {
    const trimmed = rawQuery.trim()
    setQuery(trimmed)
    setActiveQuery(trimmed)
  }

  // Catat ke riwayat tontonan setiap kali film/serial dibuka.
  const handlePlay = (movie) => {
    recordWatch(movie)
    setPlaying(movie)
  }

  // Perbarui posisi tontonan saat player melaporkan progres.
  const handleProgress = (movie, progressSeconds, duration) => {
    recordWatch(movie, progressSeconds, duration)
  }

  return (
    <div className="min-h-screen">
      <NetflixLoader active={!firstLoaded} />

      <Navbar
        showBg={showNavBg}
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
      />

      {activeQuery ? (
        <main className="relative z-10 mt-0 min-h-[70vh] pt-[120px] pb-10">
          <SearchResults query={activeQuery} onPlay={handlePlay} />
        </main>
      ) : (
        <>
          <Banner
            fetchUrl={requests.trending}
            onPlay={handlePlay}
            isInMyList={isInList}
            onToggleMyList={toggleMyList}
            onLoaded={() => setFirstLoaded(true)}
          />

          <main className="relative z-10 -mt-[120px] pb-10">
            <WatchHistoryRow items={historyItems} onPlay={handlePlay} />
            <MyListRow items={myList} onPlay={handlePlay} onRemove={toggleMyList} />

            <Row
              title="Tren Minggu Ini"
              fetchUrl={requests.trending}
              large
              onPlay={handlePlay}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Film Rating Tertinggi"
              fetchUrl={requests.topRated}
              onPlay={handlePlay}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Film Aksi"
              fetchUrl={requests.action}
              onPlay={handlePlay}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Komedi"
              fetchUrl={requests.comedy}
              onPlay={handlePlay}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Horor"
              fetchUrl={requests.horror}
              onPlay={handlePlay}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Dokumenter"
              fetchUrl={requests.documentaries}
              onPlay={handlePlay}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
          </main>
        </>
      )}

      <Footer />

      {playing && (
        <PlayerModal
          movie={playing}
          onClose={() => setPlaying(null)}
          inMyList={isInList(playing.id)}
          onToggleMyList={() => toggleMyList(playing)}
          onProgress={handleProgress}
        />
      )}
    </div>
  )
}
