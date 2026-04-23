import { useCallback, useEffect, useRef, useState } from 'react'
import { NEWS_AUTOPLAY_MS, NEWS_MANUAL_PAUSE_MS, NEWS_SLIDE_TRANSITION_MS, newsSlides } from '../model/constants'

export function useNewsSlider() {
  const [slideIndex, setSlideIndex] = useState(0)
  const [isAutoplayPaused, setIsAutoplayPaused] = useState(false)
  const [incomingSlideIndex, setIncomingSlideIndex] = useState<number | null>(null)
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1)
  const [isTransitionActive, setIsTransitionActive] = useState(false)

  const pauseTimeoutRef = useRef<number | null>(null)
  const transitionStartFrameRef = useRef<number | null>(null)
  const transitionFallbackTimeoutRef = useRef<number | null>(null)

  const isSwitching = incomingSlideIndex !== null
  const activeIndicatorIndex = incomingSlideIndex ?? slideIndex
  const slideTransitionStyle = { transitionDuration: `${NEWS_SLIDE_TRANSITION_MS}ms` }

  const finishTransition = useCallback((nextIndex: number) => {
    setSlideIndex(nextIndex)
    setIncomingSlideIndex(null)
    setIsTransitionActive(false)
    if (transitionFallbackTimeoutRef.current !== null) {
      window.clearTimeout(transitionFallbackTimeoutRef.current)
      transitionFallbackTimeoutRef.current = null
    }
  }, [])

  const pauseAutoplay = useCallback(() => {
    setIsAutoplayPaused(true)
    if (pauseTimeoutRef.current !== null) {
      window.clearTimeout(pauseTimeoutRef.current)
    }
    pauseTimeoutRef.current = window.setTimeout(() => {
      setIsAutoplayPaused(false)
      pauseTimeoutRef.current = null
    }, NEWS_MANUAL_PAUSE_MS)
  }, [])

  const startTransition = useCallback(
    (targetIndex: number, direction: -1 | 1, isManual: boolean) => {
      if (targetIndex === slideIndex || isSwitching) {
        if (isManual) pauseAutoplay()
        return
      }
      if (isManual) pauseAutoplay()

      if (transitionStartFrameRef.current !== null) cancelAnimationFrame(transitionStartFrameRef.current)
      if (transitionFallbackTimeoutRef.current !== null) window.clearTimeout(transitionFallbackTimeoutRef.current)

      setTransitionDirection(direction)
      setIncomingSlideIndex(targetIndex)
      setIsTransitionActive(false)

      transitionStartFrameRef.current = requestAnimationFrame(() => {
        setIsTransitionActive(true)
        transitionStartFrameRef.current = null
      })

      transitionFallbackTimeoutRef.current = window.setTimeout(() => {
        finishTransition(targetIndex)
      }, NEWS_SLIDE_TRANSITION_MS + 80)
    },
    [finishTransition, isSwitching, slideIndex, pauseAutoplay],
  )

  const switchSlide = useCallback(
    (direction: -1 | 1, isManual = true) => {
      const nextIndex = (slideIndex + direction + newsSlides.length) % newsSlides.length
      startTransition(nextIndex, direction, isManual)
    },
    [slideIndex, startTransition],
  )

  const selectSlide = useCallback(
    (index: number) => {
      const total = newsSlides.length
      const forward = (index - slideIndex + total) % total
      const backward = (slideIndex - index + total) % total
      const direction: -1 | 1 = forward <= backward ? 1 : -1
      startTransition(index, direction, true)
    },
    [slideIndex, startTransition],
  )

  useEffect(() => {
    if (isAutoplayPaused) return
    const id = window.setInterval(() => switchSlide(1, false), NEWS_AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [isAutoplayPaused, switchSlide])

  useEffect(() => {
    return () => {
      if (pauseTimeoutRef.current !== null) window.clearTimeout(pauseTimeoutRef.current)
      if (transitionStartFrameRef.current !== null) cancelAnimationFrame(transitionStartFrameRef.current)
      if (transitionFallbackTimeoutRef.current !== null) window.clearTimeout(transitionFallbackTimeoutRef.current)
    }
  }, [])

  return {
    slideIndex,
    incomingSlideIndex,
    transitionDirection,
    isTransitionActive,
    activeIndicatorIndex,
    slideTransitionStyle,
    finishTransition,
    switchSlide,
    selectSlide,
  }
}
