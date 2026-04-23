import { useLayoutEffect, useRef, useState } from 'react'

export type SegmentedOption<T extends string> = {
  id: T
  label: string
  hint?: string
}

type SegmentedControlProps<T extends string> = {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  /** Highlight color (defaults to brand yellow). */
  highlight?: string
  textActive?: string
  textInactive?: string
  textInactiveHover?: string
  /** Container background. */
  background?: string
  className?: string
}

/**
 * Segmented control with a sliding highlight pill.
 * Measures the active button rect and animates a single absolute pill via
 * CSS `transform`/`width` transitions — gives a buttery feel without any
 * animation library.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  highlight = '#FFD400',
  textActive = '#111',
  textInactive = '#7B7B7B',
  textInactiveHover = '#111',
  background = '#F5F6F7',
  className,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  })

  useLayoutEffect(() => {
    const container = containerRef.current
    const node = buttonRefs.current[value]
    if (!container || !node) return
    const cRect = container.getBoundingClientRect()
    const nRect = node.getBoundingClientRect()
    setPill({ left: nRect.left - cRect.left, width: nRect.width, ready: true })
  }, [value, options])

  useLayoutEffect(() => {
    function onResize() {
      const container = containerRef.current
      const node = buttonRefs.current[value]
      if (!container || !node) return
      const cRect = container.getBoundingClientRect()
      const nRect = node.getBoundingClientRect()
      setPill({ left: nRect.left - cRect.left, width: nRect.width, ready: true })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [value])

  return (
    <div
      ref={containerRef}
      className={['relative inline-flex items-center gap-1 rounded-full p-1', className].filter(Boolean).join(' ')}
      style={{ background }}
    >
      {/* Sliding highlight pill */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1 bottom-1 rounded-full shadow-[0_4px_14px_rgba(255,196,0,0.30)] transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0.16,1)]"
        style={{
          background: highlight,
          width: pill.width,
          transform: `translateX(${pill.left - 4}px)`,
          opacity: pill.ready ? 1 : 0,
        }}
      />
      {options.map((opt) => {
        const isActive = opt.id === value
        return (
          <button
            key={opt.id}
            ref={(el) => {
              buttonRefs.current[opt.id] = el
            }}
            type="button"
            onClick={() => onChange(opt.id)}
            className="relative z-[1] cursor-pointer rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors duration-200"
            style={{ color: isActive ? textActive : textInactive }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = textInactiveHover
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = textInactive
            }}
          >
            {opt.label}
            {opt.hint ? <span className="ml-1 text-[10px] opacity-60">{opt.hint}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
