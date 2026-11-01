import { useEffect, useState } from 'react'

const FADE_DURATION = 600

// Splash screen ala Netflix: logo "NETFLIX" merah dengan efek kilau + bar progres.
// `active=false` memulai fade-out, lalu komponen di-unmount setelah transisi.
export default function NetflixLoader({ active }) {
  const [phase, setPhase] = useState('show')

  useEffect(() => {
    if (active) {
      setPhase('show')
      return undefined
    }

    setPhase('fade')
    const timer = setTimeout(() => setPhase('gone'), FADE_DURATION)
    return () => clearTimeout(timer)
  }, [active])

  if (phase === 'gone') return null

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black transition-opacity duration-[600ms] ${
        phase === 'fade' ? 'pointer-events-none opacity-0' : ''
      }`}
      aria-hidden={phase !== 'show'}
    >
      <div className="flex flex-col items-center gap-[18px]">
        <div className="animate-[loader-shine_2.4s_linear_infinite] bg-[linear-gradient(110deg,#8c1117_0%,#b81d24_20%,#e50914_38%,#ff4d56_50%,#e50914_62%,#b81d24_80%,#8c1117_100%)] bg-[length:220%_100%] bg-clip-text font-[Helvetica_Neue,Arial,sans-serif] text-[clamp(2.5rem,10vw,5.5rem)] font-black uppercase leading-none tracking-[0.08em] text-transparent motion-reduce:animate-none">
          NETFLIX
        </div>
        <p className="text-sm uppercase tracking-[0.25em] text-[#8c8c8c]">Loading…</p>
        <div className="h-[3px] w-[180px] overflow-hidden rounded-sm bg-[#333]" aria-hidden="true">
          <span className="block h-full w-[40%] animate-[loader-progress_1.2s_ease-in-out_infinite] rounded-sm bg-[#e50914] motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  )
}
