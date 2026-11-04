import { loginUrl } from '../api.js'

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

// Halaman login bergaya Netflix: latar gelap + glow merah + kartu "Masuk".
export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#141414] text-white">
      {/* Lapisan latar: gradasi gelap + glow merah khas Netflix. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(1200px 600px at 50% -10%, rgba(229, 9, 20, 0.35), transparent 60%),
            radial-gradient(900px 500px at 85% 110%, rgba(229, 9, 20, 0.18), transparent 60%),
            radial-gradient(700px 400px at 10% 100%, rgba(90, 0, 10, 0.25), transparent 60%),
            linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(20,20,20,0.2) 40%, #141414 100%)
          `,
        }}
      />
      {/* Garis pemisah halus di bawah header, mirip halaman login Netflix. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-white/10"
      />

      <header className="relative z-10 px-10 py-6 max-md:px-6">
        <span className="text-[1.8rem] font-black uppercase tracking-[1px] text-[#e50914] max-md:text-[1.4rem]">
          NETFLIX
        </span>
      </header>

      <main className="relative z-10 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-lg bg-black/75 p-10 max-md:p-7">
          <h1 className="mb-1 text-3xl font-bold">Masuk</h1>
          <p className="mb-8 text-sm text-[#b3b3b3]">
            Gunakan akun GitHub untuk melanjutkan ke klon Netflix ini.
          </p>

          <a
            href={loginUrl}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-[#e50914] px-4 py-3.5 text-base font-semibold text-white transition-colors duration-200 hover:bg-[#f6121d]"
          >
            <GitHubIcon />
            Masuk dengan GitHub
          </a>

          <p className="mt-6 text-xs leading-relaxed text-[#737373]">
            Data Daftar Saya &amp; riwayat tontonan akan tersimpan per akun GitHub
            Anda. Anda akan dialihkan ke GitHub untuk memberikan izin akses.
          </p>
        </div>
      </main>
    </div>
  )
}