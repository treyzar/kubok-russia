import { ChevronRight, Lock, Sparkles } from 'lucide-react'

import type { Mechanic } from '../model/mechanics'

type MechanicSidebarProps = {
  mechanics: ReadonlyArray<Mechanic>
  selectedId: string
  onSelect: (id: string) => void
  /** Optional live counter shown on each available mechanic. */
  liveCountByMechanic?: Record<string, number>
}

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
                  'group relative flex w-full items-stretch gap-3 overflow-hidden rounded-xl px-2.5 py-2.5 text-left transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-br shadow-[0_10px_28px_rgba(16,24,40,0.16)] -translate-y-[1px] text-white'
                    : 'text-[#111] hover:bg-[#F5F6F7] hover:-translate-y-[1px]',
                ].join(' ')}
                style={
                  isActive
                    ? ({
                        // Tailwind doesn't support arbitrary --from/--to vars in safelist — inline gradient.
                        backgroundImage: `linear-gradient(135deg, ${m.heroFrom}, ${m.heroTo})`,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                {/* Active vertical accent bar (slides into view) */}
                <span
                  aria-hidden
                  className={[
                    'absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-white/85 transition-all duration-300',
                    isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2',
                  ].join(' ')}
                />

                {/* Icon tile — ALWAYS gradient with mechanic colors */}
                <span
                  className={[
                    'relative grid size-11 shrink-0 place-items-center rounded-xl text-white transition-transform duration-300',
                    isActive ? 'scale-105 ring-2 ring-white/80' : 'group-hover:scale-105',
                  ].join(' ')}
                  style={{ background: `linear-gradient(135deg, ${m.heroFrom}, ${m.heroTo})` }}
                >
                  <m.Icon className="size-5" />
                  {/* Glossy highlight */}
                  <span className="pointer-events-none absolute inset-x-1 top-1 h-1/2 rounded-md bg-white/25 blur-[2px]" />
                </span>

                {/* Title + meta */}
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="flex items-center gap-1.5">
                    <span
                      className={[
                        'truncate text-[14px] font-bold leading-tight',
                        isActive ? 'text-white' : 'text-[#111]',
                      ].join(' ')}
                    >
                      {m.name}
                    </span>
                    {!m.available && (
                      <span
                        className={[
                          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                          isActive ? 'bg-white/25 text-white' : 'bg-[#F5F6F7] text-[#7B7B7B]',
                        ].join(' ')}
                      >
                        <Lock className="size-2.5" />
                        скоро
                      </span>
                    )}
                  </span>
                  <span
                    className={[
                      'mt-0.5 truncate text-[11.5px] leading-tight',
                      isActive ? 'text-white/85' : 'text-[#7B7B7B]',
                    ].join(' ')}
                  >
                    {m.short}
                  </span>
                  {m.available && typeof live === 'number' && (
                    <span
                      className={[
                        'mt-1 inline-flex items-center gap-1 text-[10.5px] font-semibold',
                        isActive ? 'text-white/95' : 'text-[#1AB75A]',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'size-1.5 rounded-full',
                          isActive ? 'bg-white' : 'bg-[#1AB75A]',
                          'animate-pulse',
                        ].join(' ')}
                      />
                      {live > 0 ? `live: ${live}` : 'нет активных'}
                    </span>
                  )}
                </span>

                {/* Chevron — only visible on hover/active */}
                <ChevronRight
                  className={[
                    'mt-0.5 size-4 self-center transition-all duration-300',
                    isActive
                      ? 'translate-x-0 text-white opacity-100'
                      : 'translate-x-[-6px] text-[#9A9A9A] opacity-0 group-hover:translate-x-0 group-hover:opacity-100',
                  ].join(' ')}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
