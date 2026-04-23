import { useEffect, useRef, useState } from 'react'

const SWITCH_DELAY_MS = 180

type UseCarouselOptions = {
  length: number
}

export function useCarousel({ length }: UseCarouselOptions) {
  const [index, setIndex] = useState(0)
  const [isSwitching, setIsSwitching] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  function navigate(direction: -1 | 1): void {
    if (isSwitching) return

    const nextIndex = (index + direction + length) % length
    setIsSwitching(true)

    timerRef.current = window.setTimeout(() => {
      setIndex(nextIndex)
      setIsSwitching(false)
      timerRef.current = null
    }, SWITCH_DELAY_MS)
  }

  return { index, isSwitching, navigate }
}
