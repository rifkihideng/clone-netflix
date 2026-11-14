import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Banner from './components/Banner.jsx'
import Row from './components/Row.jsx'
import SearchResults from './components/SearchResults.jsx'
import Footer from './components/Footer.jsx'
import PlayerModal from './components/PlayerModal.jsx'
import MyListRow from './components/MyListRow.jsx'
import WatchHistoryRow from './components/WatchHistoryRow.jsx'
import NetflixLoader from './components/NetflixLoader.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProfileSelect from './components/ProfileSelect.jsx'
import DetailModal from './components/DetailModal.jsx'
import GenreBrowse from './components/GenreBrowse.jsx'
import Top10Row from './components/Top10Row.jsx'
import { useAuth } from './hooks/useAuth.js'
import { useMyList } from './hooks/useMyList.js'
import { useWatchHistory } from './hooks/useWatchHistory.js'
import { requests } from './api.js'
import NotFound from './pages/NotFound.jsx'

const ACTIVE_PROFILE_KEY = 'netflix-clone-active-profile'

function readActiveProfile() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const { user, loading, logout } = useAuth()
  const [activeProfile, setActiveProfile] = useState(readActiveProfile)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414]">
        <NetflixLoader active />
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  if (!activeProfile) {
    return (
      <ProfileSelect
        user={user}
        onSelect={(profile) => {
          try {
            sessionStorage.setItem(ACTIVE_PROFILE_KEY, JSON.stringify(profile))
          } catch {
            // Storage diblokir — profil tetap dipilih untuk sesi ini.
          }
          setActiveProfile(profile)
        }}
      />
    )
  }

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem(ACTIVE_PROFILE_KEY)
    } catch {
      // Storage diblokir — abaikan.
    }
    setActiveProfile(null)
    await logout()
  }

  const handleSwitchProfile = () => {
    try {
      sessionStorage.removeItem(ACTIVE_PROFILE_KEY)
    } catch {
      // Storage diblokir — abaikan.
    }
    setActiveProfile(null)
  }

  return <Home user={user} onLogout={handleLogout} onSwitchProfile={handleSwitchProfile} />
}

function Home({ user, onLogout, onSwitchProfile }) {
  const [showNavBg, setShowNavBg] = useState(false)
  const [query, setQuery] = useState('')
  const [activeQuery, setActiveQuery] = useState('')
  const [playing, setPlaying] = useState(null)
  const [detail, setDetail] = useState(null)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [firstLoaded, setFirstLoaded] = useState(false)
  const { items: myList, isInList, toggle: toggleMyList } = useMyList()
  const { items: historyItems, record: recordWatch, remove: removeWatch } = useWatchHistory()

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
    setDetail(null)
    setPlaying(movie)
  }

  // Buka modal detail film/serial.
  const handleInfo = (movie) => {
    setDetail(movie)
  }

  // Perbarui posisi tontonan saat player melaporkan progres.
  const handleProgress = (movie, progressSeconds, duration) => {
    recordWatch(movie, progressSeconds, duration)
  }

  const location = useLocation()

  // Path selain "/" (beranda) dianggap tidak ditemukan.
  if (location.pathname !== '/') {
    return <NotFound />
  }

  return (
    <div className="min-h-screen">
      <NetflixLoader active={!firstLoaded} />

      <Navbar
        showBg={showNavBg}
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        onOpenBrowse={() => setBrowseOpen(true)}
        user={user}
        onLogout={onLogout}
        onSwitchProfile={onSwitchProfile}
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
            onInfo={handleInfo}
            isInMyList={isInList}
            onToggleMyList={toggleMyList}
            onLoaded={() => setFirstLoaded(true)}
          />

          <main className="relative z-10 -mt-[120px] pb-10">
            <WatchHistoryRow
              items={historyItems}
              onPlay={handlePlay}
              onInfo={handleInfo}
              onRemove={removeWatch}
            />
            <MyListRow
              items={myList}
              onPlay={handlePlay}
              onInfo={handleInfo}
              onRemove={toggleMyList}
            />

            <Top10Row
              onPlay={handlePlay}
              onInfo={handleInfo}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />

            <Row
              title="Tren Minggu Ini"
              fetchUrl={requests.trending}
              large
              onPlay={handlePlay}
              onInfo={handleInfo}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Film Rating Tertinggi"
              fetchUrl={requests.topRated}
              onPlay={handlePlay}
              onInfo={handleInfo}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Film Aksi"
              fetchUrl={requests.action}
              onPlay={handlePlay}
              onInfo={handleInfo}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Komedi"
              fetchUrl={requests.comedy}
              onPlay={handlePlay}
              onInfo={handleInfo}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Horor"
              fetchUrl={requests.horror}
              onPlay={handlePlay}
              onInfo={handleInfo}
              isInMyList={isInList}
              onToggleMyList={toggleMyList}
            />
            <Row
              title="Dokumenter"
              fetchUrl={requests.documentaries}
              onPlay={handlePlay}
              onInfo={handleInfo}
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

      {detail && (
        <DetailModal
          key={detail.id}
          movie={detail}
          onClose={() => setDetail(null)}
          onPlay={handlePlay}
          onSelect={handleInfo}
          isInMyList={isInList}
          onToggleMyList={toggleMyList}
        />
      )}

      {browseOpen && (
        <GenreBrowse
          onClose={() => setBrowseOpen(false)}
          onPlay={handlePlay}
          onInfo={handleInfo}
          isInMyList={isInList}
          onToggleMyList={toggleMyList}
        />
      )}
    </div>
  )
}
