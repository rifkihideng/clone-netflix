import { useEffect, useState } from 'react'

// Frasa placeholder yang diketik bergantian di search bar.
const PHRASES = [
  'Cari film atau serial...',
  'Cari film aksi...',
  'Cari komedi...',
  'Cari horor...',
  'Cari dokumenter...',
]

// Hook untuk efek typewriter: mengetik, berhenti sejenak, lalu menghapus teks.
export function useTypewriter(
  phrases = PHRASES,
  { typeSpeed = 70, deleteSpeed = 40, pause = 1600 } = {},
) {
  const [text, setText] = useState('')

  useEffect(() => {
    let phraseIndex = 0
    let charIndex = 0
    let deleting = false
    let timeout

    const tick = () => {
      const phrase = phrases[phraseIndex % phrases.length]

      if (!deleting) {
        charIndex += 1
        setText(phrase.slice(0, charIndex))

        if (charIndex === phrase.length) {
          deleting = true
          timeout = setTimeout(tick, pause)
          return
        }

        timeout = setTimeout(tick, typeSpeed)
        return
      }

      charIndex -= 1
      setText(phrase.slice(0, charIndex))

      if (charIndex === 0) {
        deleting = false
        phraseIndex += 1
        timeout = setTimeout(tick, typeSpeed)
        return
      }

      timeout = setTimeout(tick, deleteSpeed)
    }

    timeout = setTimeout(tick, typeSpeed)

    return () => clearTimeout(timeout)
  }, [phrases, typeSpeed, deleteSpeed, pause])

  return text
}
