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
    <footer className="border-t border-[#2a2a2a] bg-[#141414] px-10 pb-8 pt-12 text-[#b3b3b3] max-md:px-5 max-md:pb-6 max-md:pt-10">
      <div className="mx-auto max-w-[1200px]">
        <p className="mb-6 text-[1.4rem] font-black tracking-[1px] text-[#e50914]">NETFLIX</p>

        <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6 max-md:grid-cols-[repeat(auto-fit,minmax(130px,1fr))]">
          {columns.map((column) => (
            <div key={column.title}>
              <h4 className="mb-3 text-[0.95rem] font-bold text-[#e5e5e5]">{column.title}</h4>
              {column.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  className="mb-2 block text-sm text-[#b3b3b3] transition-colors duration-200 hover:text-white"
                  onClick={(event) => event.preventDefault()}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          {socials.map((name) => (
            <a
              key={name}
              href="#"
              className="text-sm text-[#b3b3b3] transition-colors duration-200 hover:text-white"
              aria-label={name}
              onClick={(event) => event.preventDefault()}
            >
              {name}
            </a>
          ))}
        </div>

        <p className="text-xs text-[#737373]">
          © {new Date().getFullYear()} Netflix Clone — dibuat untuk belajar. Data film dari{' '}
          The Movie Database (TMDB).
        </p>
      </div>
    </footer>
  )
}
