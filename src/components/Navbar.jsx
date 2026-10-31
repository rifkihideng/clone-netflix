import { Search } from 'lucide-react'
import { BorderBeam } from '@/components/ui/border-beam-search'
import './Navbar.css'

export default function Navbar({ showBg, query, onQueryChange, onSearch }) {
  const handleSubmit = (event) => {
    event.preventDefault()
    onSearch(query)
  }

  return (
    <nav className={`navbar ${showBg ? 'navbar--solid' : ''}`}>
      <div className="navbar__inner">
        <button
          type="button"
          className="navbar__logo"
          onClick={() => onSearch('')}
          aria-label="Kembali ke beranda"
        >
          NETFLIX
        </button>

        <div className="navbar__actions">
          <form className="navbar__search" role="search" onSubmit={handleSubmit}>
            <BorderBeam size="line" colorVariant="colorful" duration={3.1} borderRadius={20}>
              <div className="navbar__search-box">
                <button className="navbar__search-button" type="submit" aria-label="Cari">
                  <Search aria-hidden="true" width={20} height={20} />
                </button>
                <input
                  className="navbar__search-input"
                  type="search"
                  placeholder="Cari film atau serial..."
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  aria-label="Cari film atau serial"
                />
              </div>
            </BorderBeam>
          </form>

          <img
            className="navbar__avatar"
            src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
            alt="Profil"
          />
        </div>
      </div>
    </nav>
  )
}
