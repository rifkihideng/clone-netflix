import './Footer.css'

const columns = [
  {
    title: 'Navigasi',
    links: ['Beranda', 'Film', 'Serial', 'Baru & Populer', 'Daftar Saya'],
  },
  {
    title: 'Bantuan',
    links: ['Pusat Bantuan', 'Hubungi Kami', 'Privasi', 'Ketentuan Penggunaan', 'Cookie'],
  },
  {
    title: 'Perusahaan',
    links: ['Tentang Kami', 'Karier', 'Media', 'Investor'],
  },
]

const socials = ['Facebook', 'Instagram', 'X (Twitter)', 'YouTube']

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <p className="footer__brand">NETFLIX</p>

        <div className="footer__columns">
          {columns.map((column) => (
            <div key={column.title} className="footer__column">
              <h4 className="footer__column-title">{column.title}</h4>
              {column.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="footer__link"
                  onClick={(event) => event.preventDefault()}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="footer__social">
          {socials.map((name) => (
            <a
              key={name}
              href="#"
              className="footer__social-link"
              aria-label={name}
              onClick={(event) => event.preventDefault()}
            >
              {name}
            </a>
          ))}
        </div>

        <p className="footer__copyright">
          © {new Date().getFullYear()} Netflix Clone — dibuat untuk belajar. Data film dari{' '}
          The Movie Database (TMDB).
        </p>
      </div>
    </footer>
  )
}
