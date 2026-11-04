const columns = [
  {
    title: 'Navigasi',
    links: [
      { label: 'Beranda', href: 'https://www.netflix.com/' },
      { label: 'Film', href: 'https://www.netflix.com/browse/genre/34399' },
      { label: 'Serial', href: 'https://www.netflix.com/browse/genre/83' },
      { label: 'Baru & Populer', href: 'https://www.netflix.com/browse/new-popular' },
      { label: 'Daftar Saya', href: 'https://www.netflix.com/browse/my-list' },
    ],
  },
  {
    title: 'Bantuan',
    links: [
      { label: 'Pusat Bantuan', href: 'https://help.netflix.com/' },
      { label: 'Hubungi Kami', href: 'https://help.netflix.com/contactus' },
      { label: 'Privasi', href: 'https://help.netflix.com/legal/privacy' },
      { label: 'Ketentuan Penggunaan', href: 'https://help.netflix.com/legal/termsofuse' },
      { label: 'Cookie', href: 'https://help.netflix.com/legal/privacy#cookies' },
    ],
  },
  {
    title: 'Perusahaan',
    links: [
      { label: 'Tentang Kami', href: 'https://about.netflix.com/' },
      { label: 'Karier', href: 'https://jobs.netflix.com/' },
      { label: 'Media', href: 'https://media.netflix.com/' },
      { label: 'Investor', href: 'https://ir.netflix.net/' },
    ],
  },
]

const socials = [
  { name: 'Facebook', href: 'https://www.facebook.com/netflix' },
  { name: 'Instagram', href: 'https://www.instagram.com/netflix' },
  { name: 'X (Twitter)', href: 'https://x.com/netflix' },
  { name: 'YouTube', href: 'https://www.youtube.com/@Netflix' },
]

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
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 block text-sm text-[#b3b3b3] transition-colors duration-200 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#b3b3b3] transition-colors duration-200 hover:text-white"
              aria-label={social.name}
            >
              {social.name}
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
