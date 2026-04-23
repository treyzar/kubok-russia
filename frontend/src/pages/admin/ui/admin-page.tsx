import { useQuery } from '@tanstack/react-query'
import { LayoutGrid, LineChart } from 'lucide-react'
import { useState } from 'react'

import { type AuthUser } from '@entities/user'
import { getHistoricalMetrics } from '@shared/api'
import { AppHeader } from '@widgets/header'

import { StatsTab } from './stats-tab'
import { TemplatesTab } from './templates-tab'

type AdminTab = 'stats' | 'templates'

type Props = {
  user: AuthUser
  onLogout: () => void
  onBrandClick: () => void
}

export function AdminPage({ user, onLogout, onBrandClick }: Props) {
  const [tab, setTab] = useState<AdminTab>('stats')

  // Pre-warm so template-form hints feel instant.
  useQuery({
    queryKey: ['admin', 'metrics', 'historical'],
    queryFn: () => getHistoricalMetrics(),
    staleTime: 60_000,
  })

  return (
    <main className="relative min-h-svh text-[#111]">
      {/* Soft layered background to match the main site */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#F7F8FA]" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(180deg, #FFF7CF 0%, #FFE680 38%, #F7F8FA 100%)',
          opacity: 0.55,
        }}
      />

      <AppHeader onBrandClick={onBrandClick} onLogout={onLogout} user={user} />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#7A37F0] shadow-[0_2px_8px_rgba(16,24,40,0.06)] backdrop-blur">
              Админ-центр
            </span>
            <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.2rem)] font-black leading-tight text-[#111]">
              Панель управления
            </h1>
            <p className="mt-1 text-[14px] text-[#7B7B7B]">
              Аналитика по проведённым комнатам и шаблонам игр.
            </p>
          </div>
        </header>

        {/* Tab pills */}
        <nav className="mb-5 inline-flex rounded-full border border-white/70 bg-white/85 p-1 shadow-[0_2px_12px_rgba(16,24,40,0.06)] backdrop-blur">
          <TabButton active={tab === 'stats'} onClick={() => setTab('stats')} Icon={LineChart}>
            Аналитика
          </TabButton>
          <TabButton active={tab === 'templates'} onClick={() => setTab('templates')} Icon={LayoutGrid}>
            Шаблоны
          </TabButton>
        </nav>

        {tab === 'stats' ? <StatsTab /> : <TemplatesTab />}
      </div>
    </main>
  )
}

function TabButton({
  active,
  onClick,
  children,
  Icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  Icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition-all duration-300',
        active
          ? 'bg-[#111] text-white shadow-[0_4px_12px_rgba(16,24,40,0.18)]'
          : 'text-[#7B7B7B] hover:text-[#111]',
      ].join(' ')}
    >
      <Icon className="size-4" />
      {children}
    </button>
  )
}
