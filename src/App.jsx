import { useEffect, useState } from 'react'
import './App.css'
import Navbar from './components/Navbar.jsx'
import Banner from './components/Banner.jsx'
import Row from './components/Row.jsx'
import SearchResults from './components/SearchResults.jsx'
import Footer from './components/Footer.jsx'
import PlayerModal from './components/PlayerModal.jsx'
import MyListRow from './components/MyListRow.jsx'
import NetflixLoader from './components/NetflixLoader.jsx'
import { useMyList } from './hooks/useMyList.js'
import { requests } from './api.js'

export default function App() {
  const [showNavBg, setShowNavBg] = useState(false)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [playing, setPlaying] = useState(null)
  const [firstLoaded, setFirstLoaded] = useState(false)
  const { items: myList, isInList, toggle: toggleMyList } = useMyList()

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

  return (
    <div className="app">
      <NetflixLoader active={!firstLoaded} />

      <Navbar
        showBg={showNavBg}
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
      />

      {activeQuery ? (
        <main className="content content--search">
          <SearchResults query={activeQuery} onPlay={setPlaying} />
        </main>
      ) : (
        <>
          <Banner
            fetchUrl={requests.trending}
            onPlay={setPlaying}
            isInMyList={isInList}
            onToggleMyList={toggleMyList}
            onLoaded={() => setFirstLoaded(true)}
          />

          <main className="content">
            <MyListRow items={myList} onPlay={setPlaying} onRemove={toggleMyList} />

            <Row
              title="Tren Minggu Ini"
              fetchUrl={requests.trending}
              large
              onPlay={setPlaying}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Film Rating Tertinggi"
              fetchUrl={requests.topRated}
              onPlay={setPlaying}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Film Aksi"
              fetchUrl={requests.action}
              onPlay={setPlaying}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Komedi"
              fetchUrl={requests.comedy}
              onPlay={setPlaying}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Horor"
              fetchUrl={requests.horror}
              onPlay={setPlaying}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Dokumenter"
              fetchUrl={requests.documentaries}
              onPlay={setPlaying}
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
        />
      )}
    </div>
  )
}
