import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, LogOut } from 'lucide-react'

import { type AuthUser } from '@/features/mock-auth/model/mock-auth'
import { Button } from '@/shared/ui/button'

type CardTestPageProps = {
  user: AuthUser
  onBackToHome: () => void
  onLogout: () => void
}

type TrainDirection = 'left' | 'right'

type DragState = {
  isDragging: boolean
  moved: boolean
  lastX: number
  startX: number
}

const AUTO_SPEED_PX_PER_SECOND = 58
const AUTO_PAUSE_MS = 5000
const DRAG_THRESHOLD_PX = 6
const FOCUS_ANIMATION_MS = 760

export function CardTestPage({ user, onBackToHome, onLogout }: CardTestPageProps) {
  const [direction, setDirection] = useState<TrainDirection>('left')
  const [selectedWagon, setSelectedWagon] = useState<number | null>(null)
  const [isAutoPaused, setIsAutoPaused] = useState(false)

  const wagons = useMemo(
    () => [
      '/dev-assets/images/card_with_peoples.svg',
      '/dev-assets/images/card_with_mascot.svg',
      '/dev-assets/card_with_products.svg',
      '/dev-assets/images/fridge.svg',
      '/dev-assets/images/big_fridge.svg',
    ],
    [],
  )

  const marqueeItems = useMemo(() => [...wagons, ...wagons], [wagons])
  const maskRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const offsetRef = useRef(0)
  const halfWidthRef = useRef(1)
  const pauseUntilRef = useRef(0)
  const directionRef = useRef<TrainDirection>(direction)
  const pausedRef = useRef(false)
  const isFocusAnimatingRef = useRef(false)
  const focusAnimationFrameRef = useRef<number | null>(null)
  const focusAnimationTimeoutRef = useRef<number | null>(null)
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    moved: false,
    lastX: 0,
    startX: 0,
  })

  function normalizeOffset(value: number): number {
    const halfWidth = halfWidthRef.current || 1
    let normalized = value % halfWidth
    if (normalized < 0) {
      normalized += halfWidth
    }
    return normalized
  }

  function applyOffset(): void {
    const track = trackRef.current
    if (!track) {
      return
    }
    track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`
  }

  function pauseAutoMovement(): void {
    pauseUntilRef.current = performance.now() + AUTO_PAUSE_MS
    if (!pausedRef.current) {
      pausedRef.current = true
      setIsAutoPaused(true)
    }
  }

  function nudgeTrack(delta: number): void {
    offsetRef.current = normalizeOffset(offsetRef.current + delta)
    applyOffset()
    pauseAutoMovement()
  }

  function animateFocusToOffset(nextOffset: number): void {
    const track = trackRef.current
    if (!track) {
      offsetRef.current = normalizeOffset(nextOffset)
      applyOffset()
      return
    }

    if (focusAnimationFrameRef.current !== null) {
      cancelAnimationFrame(focusAnimationFrameRef.current)
      focusAnimationFrameRef.current = null
    }
    if (focusAnimationTimeoutRef.current !== null) {
      window.clearTimeout(focusAnimationTimeoutRef.current)
    }
    track.style.transition = ''

    const startOffset = offsetRef.current
    const delta = nextOffset - startOffset
    const startTime = performance.now()
    isFocusAnimatingRef.current = true

    const easeInOutCubic = (t: number): number =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / FOCUS_ANIMATION_MS, 1)
      const eased = easeInOutCubic(progress)
      offsetRef.current = startOffset + delta * eased
      applyOffset()

      if (progress < 1) {
        focusAnimationFrameRef.current = requestAnimationFrame(step)
        return
      }

      isFocusAnimatingRef.current = false
      offsetRef.current = normalizeOffset(offsetRef.current)
      applyOffset()
      focusAnimationFrameRef.current = null
    }

    focusAnimationFrameRef.current = requestAnimationFrame(step)
  }

  function focusWagonByNumber(wagonNumber: number): void {
    setSelectedWagon(wagonNumber)

    const mask = maskRef.current
    const track = trackRef.current
    if (!mask || !track) {
      pauseAutoMovement()
      return
    }

    const candidates = Array.from(
      track.querySelectorAll<HTMLButtonElement>(`[data-wagon-number="${wagonNumber}"]`),
    )
    if (candidates.length === 0) {
      pauseAutoMovement()
      return
    }

    const maskRect = mask.getBoundingClientRect()
    const viewportCenterX = maskRect.left + maskRect.width / 2
    const nearest = candidates.reduce(
      (best, element) => {
        const rect = element.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const distance = Math.abs(centerX - viewportCenterX)
        if (distance < best.distance) {
          return { element, distance, centerX }
        }
        return best
      },
      { element: candidates[0], distance: Number.POSITIVE_INFINITY, centerX: 0 },
    )

    const delta = nearest.centerX - viewportCenterX
    animateFocusToOffset(offsetRef.current + delta)
    pauseAutoMovement()
  }

  useEffect(() => {
    directionRef.current = direction
  }, [direction])

  useEffect(() => {
    const track = trackRef.current
    if (!track) {
      return
    }

    const updateHalfWidth = () => {
      halfWidthRef.current = Math.max(track.scrollWidth / 2, 1)
      offsetRef.current = normalizeOffset(offsetRef.current)
      applyOffset()
    }

    updateHalfWidth()
    window.addEventListener('resize', updateHalfWidth)
    return () => {
      window.removeEventListener('resize', updateHalfWidth)
    }
  }, [marqueeItems])

  useEffect(() => {
    let rafId = 0
    let prevTime = performance.now()

    const tick = (now: number) => {
      const deltaSeconds = (now - prevTime) / 1000
      prevTime = now

      const paused = now < pauseUntilRef.current
      if (paused !== pausedRef.current) {
        pausedRef.current = paused
        setIsAutoPaused(paused)
      }

      if (!paused) {
        if (isFocusAnimatingRef.current) {
          rafId = requestAnimationFrame(tick)
          return
        }
        const dirSign = directionRef.current === 'left' ? 1 : -1
        offsetRef.current = normalizeOffset(offsetRef.current + dirSign * AUTO_SPEED_PX_PER_SECOND * deltaSeconds)
        applyOffset()
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafId)
      if (focusAnimationFrameRef.current !== null) {
        cancelAnimationFrame(focusAnimationFrameRef.current)
      }
      if (focusAnimationTimeoutRef.current !== null) {
        window.clearTimeout(focusAnimationTimeoutRef.current)
      }
    }
  }, [])

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0F0F10] text-[#F3F3F3]">
      <div className="auth-aurora auth-aurora--one" />
      <div className="auth-aurora auth-aurora--two" />
      <div className="auth-aurora auth-aurora--three" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full rounded-[1.4rem] border border-[#C9C9C9] bg-[#121314] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.38)] sm:p-5">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[#AFAFAF]">
              Тест Card для {user.name} (@{user.username})
            </p>
            <div className="flex items-center gap-2">
              <Button className="rounded-lg border-[#4B4B4B] bg-[#1D1E20] text-[#E8E8E8] hover:bg-[#292A2D]" onClick={onBackToHome} size="sm" variant="outline">
                <ArrowLeft size={15} />
                Главная
              </Button>
              <Button className="rounded-lg border-[#4B4B4B] bg-[#1D1E20] text-[#E8E8E8] hover:bg-[#292A2D]" onClick={onLogout} size="sm" variant="outline">
                <LogOut size={15} />
                Выйти
              </Button>
            </div>
          </header>

          <article className="overflow-hidden rounded-[1.05rem] border border-[#4D4D4D] bg-[linear-gradient(120deg,#1B1C1F_0%,#121315_58%,#191A1D_100%)]">
            <div className="p-5 sm:p-6">
              <p className="text-sm text-[#8E8E8E]">Тираж № 3670, 21 апр. 08:05</p>
              <h1 className="mt-2 text-[2.2rem] leading-none font-bold tracking-tight text-[#F2F2F2] sm:text-[2.55rem]">
                ВЫИГРАЙ СЕЙЧАС!
              </h1>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 sm:mt-5">
                <p className="text-sm text-[#A9A9A9]">Бесконечная прокрутка вагонов для теста интерфейса</p>
                <div className="inline-flex rounded-lg border border-[#4B4C50] bg-[#17181B] p-1">
                  <button
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      direction === 'left' ? 'bg-[#FFE129] text-[#141414]' : 'text-[#D4D4D4] hover:bg-[#2A2B2F]'
                    }`}
                    onClick={() => setDirection('left')}
                    type="button"
                  >
                    Влево
                  </button>
                  <button
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      direction === 'right' ? 'bg-[#FFE129] text-[#141414]' : 'text-[#D4D4D4] hover:bg-[#2A2B2F]'
                    }`}
                    onClick={() => setDirection('right')}
                    type="button"
                  >
                    Вправо
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-[#DADADA]">
                  Выбранный вагон:{' '}
                  <span className="font-semibold text-[#FFE129]">{selectedWagon ? `#${selectedWagon}` : 'не выбран'}</span>
                </p>
                <p className="text-[#A7A7A7]">
                  Статус движения:{' '}
                  <span className={isAutoPaused ? 'font-semibold text-[#FFE129]' : 'font-semibold text-[#86EFAC]'}>
                    {isAutoPaused ? 'пауза 5 сек' : 'автопрокрутка'}
                  </span>
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#9F9F9F]">Выбрать по номеру:</span>
                {wagons.map((_, index) => {
                  const wagonNumber = index + 1
                  return (
                    <button
                      className={`h-8 min-w-8 rounded-md border px-2 text-sm font-semibold transition ${
                        selectedWagon === wagonNumber
                          ? 'border-[#FFE129] bg-[#FFE129] text-[#171717]'
                          : 'border-[#4B4C50] bg-[#1B1C1F] text-[#E3E3E3] hover:border-[#FFE129]'
                      }`}
                      key={wagonNumber}
                      onClick={() => focusWagonByNumber(wagonNumber)}
                      type="button"
                    >
                      {wagonNumber}
                    </button>
                  )
                })}
              </div>

              <div className="wagon-marquee-mask mt-4 sm:mt-5" ref={maskRef}>
                <div
                  className="wagon-marquee-track"
                  onPointerCancel={() => {
                    dragStateRef.current.isDragging = false
                  }}
                  onPointerDown={(event) => {
                    if (event.pointerType === 'mouse' && event.button !== 0) {
                      return
                    }
                    dragStateRef.current.isDragging = true
                    dragStateRef.current.moved = false
                    dragStateRef.current.lastX = event.clientX
                    dragStateRef.current.startX = event.clientX
                    pauseAutoMovement()
                  }}
                  onPointerMove={(event) => {
                    if (!dragStateRef.current.isDragging) {
                      return
                    }
                    event.preventDefault()
                    const deltaX = event.clientX - dragStateRef.current.lastX
                    dragStateRef.current.lastX = event.clientX
                    if (Math.abs(event.clientX - dragStateRef.current.startX) > DRAG_THRESHOLD_PX) {
                      dragStateRef.current.moved = true
                    }
                    nudgeTrack(-deltaX)
                  }}
                  onPointerUp={() => {
                    dragStateRef.current.isDragging = false
                    pauseAutoMovement()
                  }}
                  onWheel={(event) => {
                    event.preventDefault()
                    nudgeTrack(event.deltaY + event.deltaX)
                  }}
                  onDragStart={(event) => event.preventDefault()}
                  ref={trackRef}
                >
                  {marqueeItems.map((wagonPath, index) => {
                    const wagonNumber = (index % wagons.length) + 1

                    return (
                      <button
                        className={`wagon-marquee-item ${selectedWagon === wagonNumber ? 'wagon-marquee-item--selected' : ''}`}
                        data-wagon-number={wagonNumber}
                        key={`${wagonPath}-${index}`}
                        onClick={(event) => {
                          if (event.detail !== 2) {
                            return
                          }
                          focusWagonByNumber(wagonNumber)
                        }}
                        type="button"
                      >
                        <img
                          alt={`Вагон номер ${wagonNumber}`}
                          className="h-auto w-full object-contain"
                          draggable={false}
                          src={wagonPath}
                        />
                        <span className="absolute top-2 left-2 rounded-md bg-[#111111]/85 px-2 py-1 text-xs font-semibold text-[#F4F4F4]">
                          Вагон #{wagonNumber}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-[#3E3F42] px-5 py-4 sm:px-6">
              <Button className="h-11 rounded-lg bg-[#FFE129] px-5 font-semibold text-[#171717] shadow-[0_6px_18px_rgba(255,225,41,0.35)] hover:bg-[#F0D117]">
                Проверить вагон | 1 бонус
              </Button>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}
