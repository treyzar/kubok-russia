import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { type AuthUser } from '@entities/user'
import { getHistoricalMetrics } from '@shared/api'
import { AppHeader } from '@widgets/header'

import { StatsTab } from './stats-tab'
import { TemplatesTab } from './templates-tab'

type AdminTab = 'templates' | 'stats'

type Props = {
  user: AuthUser
  onLogout: () => void
  onBrandClick: () => void
}

export function AdminPage({ user, onLogout, onBrandClick }: Props) {
  const [tab, setTab] = useState<AdminTab>('templates')

  // Pre-warm the weekly-averages cache so template-form hints feel instant.
  const { data: weekly } = useQuery({
    queryKey: ['admin', 'metrics', 'historical'],
    queryFn: () => getHistoricalMetrics(),
    staleTime: 60_000,
  })

  return (
    <main className="fixed inset-0 overflow-y-auto bg-[#0F1014] text-[#F2F3F5]">
      <AppHeader onBrandClick={onBrandClick} onLogout={onLogout} user={user} />

      <div className="mx-auto max-w-[1248px] px-4 py-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[1.8rem] font-semibold tracking-tight">Админ-панель</h1>
            <p className="mt-1 text-[13px] text-[#9098A8]">
              Управление шаблонами игр и аналитика по проведённым комнатам.
            </p>
          </div>
          {weekly ? (
            <div className="rounded-md border border-[#2B2C30] bg-[#181920] px-4 py-2 text-[12px] text-[#9098A8]">
              Среднее за неделю: <span className="text-[#A8E45E]">{weekly.avg_real_players_per_room.toFixed(1)} игроков</span>
              {' / взнос '}
              <span className="text-[#A8E45E]">{weekly.avg_entry_cost.toLocaleString('ru-RU')}</span>
            </div>
          ) : null}
        </header>

        <nav className="mb-4 flex gap-1 border-b border-[#2B2C30]">
          <TabButton active={tab === 'templates'} onClick={() => setTab('templates')}>
            Шаблоны
          </TabButton>
          <TabButton active={tab === 'stats'} onClick={() => setTab('stats')}>
            Статистика
          </TabButton>
        </nav>

        {tab === 'templates' ? <TemplatesTab /> : <StatsTab />}
      </div>
    </main>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] font-medium transition ${
        active
          ? 'border-[#A8E45E] text-[#F2F3F5]'
          : 'border-transparent text-[#9098A8] hover:text-[#F2F3F5]'
      }`}
    >
      {children}
    </button>
  )
}
