import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ChevronDown,
  CircleDollarSign,
  LogOut,
  Newspaper,
  Plus,
  Send,
  Trophy,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { type AuthUser } from '@/features/mock-auth/model/mock-auth'
import { Button } from '@/shared/ui/button'

type HomePageProps = {
  user: AuthUser
  onLogout: () => void
}

type LastGameItem = {
  id: string
  title: string
  amount: string
  amountColor: string
  image: string
  bg: string
}

const lastGames: LastGameItem[] = [
  {
    id: '634010',
    title: 'Игра №634010',
    amount: '+30 110 ₽',
    amountColor: 'text-[#25D347]',
    image: '/dev-assets/images/card_with_mascot.svg',
    bg: 'bg-[#5C2DFF]',
  },
  {
    id: '620341',
    title: 'Игра №620341',
    amount: '-110 ₽',
    amountColor: 'text-[#FF4040]',
    image: '/dev-assets/images/card_with_peoples.svg',
    bg: 'bg-[#FF1493]',
  },
  {
    id: '619934',
    title: 'Игра №619934',
    amount: '+7 256 ₽',
    amountColor: 'text-[#25D347]',
    image: '/dev-assets/images/fridge.svg',
    bg: 'bg-[#A7E35D]',
  },
  {
    id: '592006',
    title: 'Игра №592006',
    amount: '+156 ₽',
    amountColor: 'text-[#25D347]',
    image: '/dev-assets/images/card_with_products.svg',
    bg: 'bg-[#6E27F2]',
  },
  {
    id: '589941',
    title: 'Игра №589941',
    amount: '+1 256 ₽',
    amountColor: 'text-[#25D347]',
    image: '/dev-assets/images/logo.svg',
    bg: 'bg-[#FF2A1A]',
  },
]

type NewsSlideItem = {
  id: string
  image: string
  alt: string
}

const newsSlides: NewsSlideItem[] = [
  {
    id: 'coupon',
    image: '/dev-assets/card_with_products.svg',
    alt: 'Новостной баннер с акцией',
  },
  {
    id: 'winners',
    image: '/dev-assets/images/card_with_peoples.svg',
    alt: 'Новостной баннер с победителями',
  },
  {
    id: 'fridge',
    image: '/dev-assets/images/fridge_with_blocks.svg',
    alt: 'Новостной баннер с игровым холодильником',
  },
]

const NEWS_AUTOPLAY_MS = 4200
const NEWS_MANUAL_PAUSE_MS = 5000
const NEWS_SLIDE_TRANSITION_MS = 860

export function HomePage({ user, onLogout }: HomePageProps) {
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

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

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
          <header className="shrink-0 border-b border-[#2A2B31] bg-[#1B1C22] px-4 py-4 lg:px-8">
            <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
              <div className="flex items-center gap-3">
                <img alt="Ночной жор" className="h-12 w-12 rounded-full bg-[#B4F25B] p-1.5" src="/dev-assets/images/logo.svg" />
                <p className="text-[clamp(1.2rem,2.4vw,2rem)] leading-none font-semibold uppercase">Ночной Жор</p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Button
                  className="h-12 rounded-[10px] border border-[#E21F90] bg-[#3B2254] px-4 text-[0.96rem] font-semibold text-[#EDEAF7] hover:bg-[#47295F]"
                  type="button"
                  variant="outline"
                >
                  <CircleDollarSign className="mr-1 size-4 text-[#8E33FF]" />
                  12 000.00
                  <ChevronDown className="ml-1 size-4" />
                </Button>
                <Button
                  className="h-12 w-12 rounded-[10px] bg-[#FF1894] p-0 text-white hover:bg-[#FF2AA0]"
                  type="button"
                >
                  <Plus className="size-6" />
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  className="h-12 rounded-[10px] border border-[#7620F5] bg-[#2A1F44] px-3.5 text-[#F0ECFB] hover:bg-[#312550]"
                  type="button"
                  variant="outline"
                >
                  <img alt={user.name} className="mr-2 h-7 w-7 rounded-full object-cover" src="/dev-assets/images/card_with_peoples.svg" />
                  <span className="max-w-[140px] truncate text-[0.95rem]">{user.name}</span>
                  <ChevronDown className="ml-2 size-4" />
                </Button>
                <Button className="h-12 w-12 rounded-[10px] border border-[#3A3B42] bg-[#1C1D24] p-0" type="button" variant="outline">
                  <Send className="size-5" />
                </Button>
                <Button className="h-12 w-12 rounded-[10px] border border-[#3A3B42] bg-[#1C1D24] p-0" type="button" variant="outline">
                  <Bell className="size-5" />
                </Button>
              </div>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-5 overflow-hidden px-4 py-5 lg:grid-cols-[420px_1fr] lg:px-8 lg:py-6">
            <aside className="relative h-full min-h-0 overflow-hidden rounded-[10px] border border-[#2B2C30] bg-[#14151A]">
              <img
                alt="Игровой холодильник"
                className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
                src="/dev-assets/images/fridge_with_blocks.svg"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#111217]/40" />
              <div className="absolute bottom-9 left-4 right-4 z-10 flex flex-col gap-3">
                <Button className="h-16 rounded-[9px] bg-[#6B22F5] text-[2rem] font-semibold text-white hover:bg-[#7A36F7]" type="button">
                  Быстрая игра
                </Button>
                <Button className="h-16 rounded-[9px] bg-[#FF1493] text-[2rem] font-semibold text-white hover:bg-[#FF2CA0]" type="button">
                  Создать игру
                </Button>
                <Button className="h-16 rounded-[9px] bg-[#A8E45E] text-[1.85rem] font-semibold text-[#101114] hover:bg-[#B9ED76]" type="button">
                  Присоединиться к игре
                </Button>
              </div>
            </aside>

            <section className="min-w-0 min-h-0 overflow-hidden">
              <div>
                <h2 className="inline-flex items-center gap-2 text-[2rem] font-semibold text-[#A8E45E]">
                  <Newspaper className="size-6" />
                  Новости
                </h2>

                <div className="mt-3 overflow-hidden rounded-[8px] border border-[#2D2E33]">
                  <div className="relative h-[140px]">
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
                          <img alt={slide.alt} className="h-full w-full object-cover" loading="eager" src={slide.image} />
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
                        <img alt={game.title} className="h-[120px] w-full object-cover object-center" src={game.image} />
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
