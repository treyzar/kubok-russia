import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  Newspaper,
  Trophy,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useBodyScrollLock } from '@shared/lib'
import { Button } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import {
  NEWS_AUTOPLAY_MS,
  NEWS_MANUAL_PAUSE_MS,
  NEWS_SLIDE_TRANSITION_MS,
  lastGames,
  newsSlides,
  type HomePageProps,
} from '../model'

export function HomePage({ onBrandClick, onCreateGame, onJoinGame, user, onLogout }: HomePageProps) {
  const [newsSlideIndex, setNewsSlideIndex] = useState(0)
  const [isNewsAutoplayPaused, setIsNewsAutoplayPaused] = useState(false)
  const [newsIncomingSlideIndex, setNewsIncomingSlideIndex] = useState<number | null>(null)
  const [newsTransitionDirection, setNewsTransitionDirection] = useState<1 | -1>(1)
  const [isNewsTransitionActive, setIsNewsTransitionActive] = useState(false)
  const newsPauseTimeoutRef = useRef<number | null>(null)
  const newsTransitionStartFrameRef = useRef<number | null>(null)
  const newsTransitionFallbackTimeoutRef = useRef<number | null>(null)

  const isNewsSwitching = newsIncomingSlideIndex !== null
  const activeNewsIndicatorIndex = newsIncomingSlideIndex ?? newsSlideIndex
  const newsSlideTransitionStyle = { transitionDuration: `${NEWS_SLIDE_TRANSITION_MS}ms` }

  const finishNewsTransition = useCallback((nextIndex: number) => {
    setNewsSlideIndex(nextIndex)
    setNewsIncomingSlideIndex(null)
    setIsNewsTransitionActive(false)

    if (newsTransitionFallbackTimeoutRef.current !== null) {
      window.clearTimeout(newsTransitionFallbackTimeoutRef.current)
      newsTransitionFallbackTimeoutRef.current = null
    }
  }, [])

  const pauseNewsAutoplay = useCallback(() => {
    setIsNewsAutoplayPaused(true)
    if (newsPauseTimeoutRef.current !== null) {
      window.clearTimeout(newsPauseTimeoutRef.current)
    }

    newsPauseTimeoutRef.current = window.setTimeout(() => {
      setIsNewsAutoplayPaused(false)
      newsPauseTimeoutRef.current = null
    }, NEWS_MANUAL_PAUSE_MS)
  }, [])

  const startNewsTransition = useCallback(
    (targetIndex: number, direction: -1 | 1, isManual: boolean) => {
      if (targetIndex === newsSlideIndex || isNewsSwitching) {
        if (isManual) {
          pauseNewsAutoplay()
        }
        return
      }

      if (isManual) {
        pauseNewsAutoplay()
      }

      if (newsTransitionStartFrameRef.current !== null) {
        cancelAnimationFrame(newsTransitionStartFrameRef.current)
      }
      if (newsTransitionFallbackTimeoutRef.current !== null) {
        window.clearTimeout(newsTransitionFallbackTimeoutRef.current)
      }

      setNewsTransitionDirection(direction)
      setNewsIncomingSlideIndex(targetIndex)
      setIsNewsTransitionActive(false)
      newsTransitionStartFrameRef.current = requestAnimationFrame(() => {
        setIsNewsTransitionActive(true)
        newsTransitionStartFrameRef.current = null
      })

      newsTransitionFallbackTimeoutRef.current = window.setTimeout(() => {
        finishNewsTransition(targetIndex)
      }, NEWS_SLIDE_TRANSITION_MS + 80)
    },
    [finishNewsTransition, isNewsSwitching, newsSlideIndex, pauseNewsAutoplay],
  )

  const switchNewsSlide = useCallback(
    (direction: -1 | 1, isManual = true) => {
      const nextIndex = (newsSlideIndex + direction + newsSlides.length) % newsSlides.length
      startNewsTransition(nextIndex, direction, isManual)
    },
    [newsSlideIndex, startNewsTransition],
  )

  const selectNewsSlide = useCallback(
    (index: number) => {
      const totalSlides = newsSlides.length
      const forwardDistance = (index - newsSlideIndex + totalSlides) % totalSlides
      const backwardDistance = (newsSlideIndex - index + totalSlides) % totalSlides
      const direction: -1 | 1 = forwardDistance <= backwardDistance ? 1 : -1
      startNewsTransition(index, direction, true)
    },
    [newsSlideIndex, startNewsTransition],
  )

  useBodyScrollLock()

  useEffect(() => {
    if (isNewsAutoplayPaused) {
      return
    }

    const autoplayTimer = window.setInterval(() => {
      switchNewsSlide(1, false)
    }, NEWS_AUTOPLAY_MS)

    return () => {
      window.clearInterval(autoplayTimer)
    }
  }, [isNewsAutoplayPaused, switchNewsSlide])

  useEffect(() => {
    return () => {
      if (newsPauseTimeoutRef.current !== null) {
        window.clearTimeout(newsPauseTimeoutRef.current)
      }
      if (newsTransitionStartFrameRef.current !== null) {
        cancelAnimationFrame(newsTransitionStartFrameRef.current)
      }
      if (newsTransitionFallbackTimeoutRef.current !== null) {
        window.clearTimeout(newsTransitionFallbackTimeoutRef.current)
      }
    }
  }, [])

  return (
    <main className="fixed inset-0 overflow-hidden overscroll-none bg-[#0F1014] text-[#F2F3F5]">
      <section className="flex h-full w-full flex-col overflow-hidden border border-[#2A2B31] bg-[#15161C]">
          <AppHeader onBrandClick={onBrandClick} onCreateGame={onCreateGame} user={user} />

          <div className="grid min-h-0 flex-1 gap-5 overflow-hidden px-4 py-5 lg:grid-cols-[420px_1fr] lg:px-8 lg:py-6">
            <aside className="relative min-h-[360px] overflow-hidden rounded-[10px] border border-[#2B2C30] bg-[#14151A] sm:min-h-[430px] lg:h-full lg:min-h-0">
              <img
                alt="Игровой холодильник"
                className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
                src="/dev-assets/images/fridge_with_blocks.svg"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#111217]/40" />
              <div className="absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-5">
                <div className="w-full max-w-[360px] space-y-3 sm:max-w-[380px]">
                  <Button className="h-12 w-full rounded-[9px] bg-[#6B22F5] text-[clamp(1.1rem,2.25vw,2rem)] font-semibold text-white hover:bg-[#7A36F7] sm:h-14 lg:h-16" type="button">
                    Быстрая игра
                  </Button>
                  <Button className="h-12 w-full rounded-[9px] bg-[#FF1493] text-[clamp(1.1rem,2.25vw,2rem)] font-semibold text-white hover:bg-[#FF2CA0] sm:h-14 lg:h-16" onClick={onCreateGame} type="button">
                    Создать игру
                  </Button>
                  <Button className="h-12 w-full rounded-[9px] bg-[#A8E45E] text-[clamp(1.1rem,2.15vw,1.85rem)] font-semibold text-[#101114] hover:bg-[#B9ED76] sm:h-14 lg:h-16" onClick={onJoinGame} type="button">
                    Присоединиться к игре
                  </Button>
                </div>
              </div>
            </aside>

            <section className="min-w-0 min-h-0 overflow-hidden">
              <div>
                <h2 className="inline-flex items-center gap-2 text-[2rem] font-semibold text-[#A8E45E]">
                  <Newspaper className="size-6" />
                  Новости
                </h2>

                <div className="mt-3 overflow-hidden rounded-[8px] border border-[#2D2E33]">
                  <div className="relative h-[220px]">
                    {newsSlides.map((slide, index) => {
                      const isCurrentSlide = index === newsSlideIndex
                      const isIncomingSlide = newsIncomingSlideIndex !== null && index === newsIncomingSlideIndex
                      const isOutgoingSlide = newsIncomingSlideIndex !== null && isCurrentSlide

                      const layerClass = (() => {
                        if (isIncomingSlide) {
                          return isNewsTransitionActive
                            ? 'z-30 translate-x-0 opacity-100'
                            : newsTransitionDirection === 1
                              ? 'z-30 translate-x-1 opacity-0'
                              : 'z-30 -translate-x-1 opacity-0'
                        }

                        if (isOutgoingSlide) {
                          return isNewsTransitionActive
                            ? newsTransitionDirection === 1
                              ? 'z-20 -translate-x-1 opacity-0'
                              : 'z-20 translate-x-1 opacity-0'
                            : 'z-20 translate-x-0 opacity-100'
                        }

                        if (isCurrentSlide) {
                          return 'z-10 translate-x-0 opacity-100'
                        }

                        return 'z-0 translate-x-0 opacity-0'
                      })()

                      return (
                        <div
                          className={`absolute inset-0 transform-gpu transition-[transform,opacity] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] ${layerClass}`}
                          key={slide.id}
                          onTransitionEnd={(event) => {
                            if (
                              event.target !== event.currentTarget ||
                              !isIncomingSlide ||
                              newsIncomingSlideIndex === null ||
                              !isNewsTransitionActive
                            ) {
                              return
                            }
                            if (event.propertyName !== 'transform' && event.propertyName !== 'opacity') {
                              return
                            }
                            finishNewsTransition(newsIncomingSlideIndex)
                          }}
                          style={newsSlideTransitionStyle}
                        >
                          <img alt={slide.alt} className="h-full w-full object-cover object-top" loading="eager" src={slide.image} />
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Button
                    aria-label="Предыдущая новость"
                    className="h-9 w-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] p-0"
                    onClick={() => switchNewsSlide(-1)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    {newsSlides.map((slide, index) => (
                      <button
                        aria-label={`Перейти к слайду ${index + 1}`}
                        className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                          activeNewsIndicatorIndex === index ? 'w-4 bg-[#E7E8EC]' : 'bg-[#75757C] hover:bg-[#9FA0A9]'
                        }`}
                        key={slide.id}
                        onClick={() => selectNewsSlide(index)}
                        type="button"
                      />
                    ))}
                  </div>
                  <Button
                    aria-label="Следующая новость"
                    className="h-9 w-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] p-0"
                    onClick={() => switchNewsSlide(1)}
                    type="button"
                    variant="outline"
                  >
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="inline-flex items-center gap-2 text-[2rem] font-semibold text-[#A8E45E]">
                  <Trophy className="size-6" />
                  Последние игры
                </h2>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {lastGames.map((game) => (
                    <article key={game.id}>
                      <div className={`overflow-hidden rounded-[14px] ${game.bg}`}>
                        <img alt={game.title} className="h-[104px] w-full object-contain object-center p-2" src={game.image} />
                      </div>
                      <p className="mt-2 text-[1rem] text-[#A9ACB4]">{game.title}</p>
                      <p className={`text-[1rem] font-semibold ${game.amountColor}`}>{game.amount}</p>
                    </article>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <Button className="h-9 w-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] p-0" type="button" variant="outline">
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button className="h-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] px-4 text-[0.95rem]" type="button" variant="outline">
                    Все игры
                  </Button>
                  <Button className="h-9 w-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] p-0" type="button" variant="outline">
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <footer className="shrink-0 border-t border-[#2A2B31] bg-[#121319]">
            <div className="flex flex-col gap-3 px-4 py-4 text-[1.05rem] text-[#DFE1E6] sm:flex-row sm:items-center sm:justify-between lg:px-8">
              <p>© All rights reserved.</p>
              <p>Powered by Skyeng</p>
            </div>
          </footer>
      </section>

      <Button className="sr-only" onClick={onLogout} type="button" variant="ghost">
        <LogOut className="size-4" />
        Выйти
      </Button>
    </main>
  )
}
