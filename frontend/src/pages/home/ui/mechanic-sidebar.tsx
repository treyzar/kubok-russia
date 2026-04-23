import { ChevronRight, Lock, Sparkles } from 'lucide-react'

import type { Mechanic } from '../model/mechanics'

type MechanicSidebarProps = {
  mechanics: ReadonlyArray<Mechanic>
  selectedId: string
  onSelect: (id: string) => void
  /** Optional live counter shown on each available mechanic. */
  liveCountByMechanic?: Record<string, number>
}

const TRANSITION_MS = 600

export function MechanicSidebar({
  mechanics,
  selectedId,
  onSelect,
  liveCountByMechanic,
}: MechanicSidebarProps) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-2.5 shadow-[0_8px_24px_rgba(16,24,40,0.06)] backdrop-blur">
      <div className="flex items-center justify-between px-2.5 pt-1.5 pb-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7B7B7B]">
          <Sparkles className="size-3.5 text-[#FFC400]" />
          Каталог игр
        </span>
        <span className="text-[11px] font-semibold text-[#9A9A9A]">{mechanics.length}</span>
      </div>

      <ul className="space-y-1.5">
        {mechanics.map((m) => {
          const isActive = m.id === selectedId
          const live = liveCountByMechanic?.[m.id]
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelect(m.id)}
                aria-pressed={isActive}
                className={[
                  'group relative flex w-full items-stretch gap-3 overflow-hidden rounded-xl px-2.5 py-2.5 text-left',
                  'transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0.16,1)]',
                  isActive ? '-translate-y-[1px]' : 'hover:-translate-y-[1px]',
                ].join(' ')}
                style={{ transitionDuration: `${TRANSITION_MS}ms` }}
              >
                {/* Layer 1 (back): inactive hover background. Sits behind the gradient layer. */}
                <span
                  aria-hidden
                  className={[
                    'absolute inset-0 rounded-xl bg-[#F5F6F7] transition-opacity ease-out',
                    isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-100',
                  ].join(' ')}
                  style={{ transitionDuration: `${TRANSITION_MS}ms` }}
                />

                {/* Layer 2 (active gradient): cross-fades in/out smoothly. */}
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-xl shadow-[0_10px_28px_rgba(16,24,40,0.16)] transition-opacity ease-out"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${m.heroFrom}, ${m.heroTo})`,
                    opacity: isActive ? 1 : 0,
                    transitionDuration: `${TRANSITION_MS}ms`,
                  }}
                />

                {/* Active vertical accent bar */}
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-white/85 transition-all ease-out"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'translateX(0)' : 'translateX(-8px)',
                    transitionDuration: `${TRANSITION_MS}ms`,
                  }}
                />

                {/* Icon tile — gradient with mechanic colors */}
                <span
                  aria-hidden
                  className={[
                    'relative z-[1] grid size-11 shrink-0 place-items-center rounded-xl text-white',
                    'transition-transform ease-out',
                    isActive ? 'scale-105 ring-2 ring-white/80' : 'group-hover:scale-105',
                  ].join(' ')}
                  style={{
                    background: `linear-gradient(135deg, ${m.heroFrom}, ${m.heroTo})`,
                    transitionDuration: `${TRANSITION_MS}ms`,
                  }}
                >
                  <m.Icon className="size-5" />
                  <span className="pointer-events-none absolute inset-x-1 top-1 h-1/2 rounded-md bg-white/25 blur-[2px]" />
                </span>

                {/* Title + meta */}
                <span className="relative z-[1] flex min-w-0 flex-1 flex-col justify-center">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="truncate text-[14px] font-bold leading-tight transition-colors ease-out"
                      style={{
                        color: isActive ? '#fff' : '#111',
                        transitionDuration: `${TRANSITION_MS}ms`,
                      }}
                    >
                      {m.name}
                    </span>
                    {!m.available && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition-colors ease-out"
                        style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#F5F6F7',
                          color: isActive ? '#fff' : '#7B7B7B',
                          transitionDuration: `${TRANSITION_MS}ms`,
                        }}
                      >
                        <Lock className="size-2.5" />
                        скоро
                      </span>
                    )}
                  </span>
                  <span
                    className="mt-0.5 truncate text-[11.5px] leading-tight transition-colors ease-out"
                    style={{
                      color: isActive ? 'rgba(255,255,255,0.85)' : '#7B7B7B',
                      transitionDuration: `${TRANSITION_MS}ms`,
                    }}
                  >
                    {m.short}
                  </span>
                  {m.available && typeof live === 'number' && (
                    <span
                      className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold transition-colors ease-out"
                      style={{
                        color: isActive ? 'rgba(255,255,255,0.95)' : '#1AB75A',
                        transitionDuration: `${TRANSITION_MS}ms`,
                      }}
                    >
                      <span
                        className={['size-1.5 rounded-full animate-pulse'].join(' ')}
                        style={{ backgroundColor: isActive ? '#fff' : '#1AB75A' }}
                      />
                      {live > 0 ? `live: ${live}` : 'нет активных'}
                    </span>
                  )}
                </span>

                {/* Chevron */}
                <ChevronRight
                  className="relative z-[1] mt-0.5 size-4 self-center transition-all ease-out"
                  style={{
                    color: isActive ? '#fff' : '#9A9A9A',
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? 'translateX(0)' : 'translateX(-6px)',
                    transitionDuration: `${TRANSITION_MS}ms`,
                  }}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
