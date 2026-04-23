import { useQuery } from '@tanstack/react-query'
import { Activity, BarChart3, Coins, Layers, PieChart, Trophy, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { adminStatsTemplatePath } from '@app/providers/router/config/route-paths'
import {
  type AdminTemplateListItem,
  type AdminTimePeriod,
  getHistoricalMetrics,
  listAdminTemplates,
} from '@shared/api'

import { BarChart } from './charts/bar-chart'
import { DonutChart } from './charts/donut-chart'
import { KpiCard } from './charts/kpi-card'

const PERIOD_OPTIONS: ReadonlyArray<{ value: AdminTimePeriod; label: string }> = [
  { value: 'hour', label: 'Час' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё время' },
]

type SortKey = 'completed_rooms' | 'entry_cost' | 'winner_pct' | 'max_players' | 'created_at'

function gameTypeLabel(t: string): string {
  if (t === 'fridge') return 'Ночной жор'
  return t
}

export function StatsTab() {
  const [period, setPeriod] = useState<AdminTimePeriod>('all')
  const [sortBy, setSortBy] = useState<SortKey>('completed_rooms')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'templates', 'stats', period],
    queryFn: () => listAdminTemplates({ period }),
  })

  const { data: historical } = useQuery({
    queryKey: ['admin', 'metrics', 'historical'],
    queryFn: () => getHistoricalMetrics(),
    staleTime: 60_000,
  })

  const templates = useMemo(() => sortTemplates(data?.templates ?? [], sortBy, sortOrder), [data, sortBy, sortOrder])

  // KPIs
  const kpis = useMemo(() => {
    const list = data?.templates ?? []
    const totalCompleted = list.reduce((acc, t) => acc + t.completed_rooms, 0)
    const active = list.filter((t) => !t.deleted_at)
    const archived = list.length - active.length
    const avgEntry = list.length > 0 ? Math.round(list.reduce((a, t) => a + t.entry_cost, 0) / list.length) : 0
    const avgWinnerPct = list.length > 0 ? list.reduce((a, t) => a + t.winner_pct, 0) / list.length : 0
    return {
      totalCompleted,
      activeCount: active.length,
      archivedCount: archived,
      avgEntry,
      avgWinnerPct,
    }
  }, [data])

  // Charts: top by completed_rooms
  const topByCompleted = useMemo(() => {
    const list = (data?.templates ?? [])
      .filter((t) => t.completed_rooms > 0)
      .sort((a, b) => b.completed_rooms - a.completed_rooms)
      .slice(0, 5)
    return list.map((t) => ({
      label: t.name?.trim() ? t.name : `#${t.template_id} · ${gameTypeLabel(t.game_type)}`,
      value: t.completed_rooms,
      hint: 'игр',
    }))
  }, [data])

  // Donut: active vs archived
  const lifecycleSlices = useMemo(() => {
    return [
      { label: 'Активные', value: kpis.activeCount, color: '#1AB75A' },
      { label: 'Архивные', value: kpis.archivedCount, color: '#9A9A9A' },
    ]
  }, [kpis])

  // Donut: distribution by entry-cost bucket
  const priceBuckets = useMemo(() => {
    const buckets = [
      { label: 'до 100', value: 0, color: '#FFD400' },
      { label: '100–500', value: 0, color: '#FF7A00' },
      { label: '500–2000', value: 0, color: '#E5008C' },
      { label: '2000+', value: 0, color: '#7A37F0' },
    ]
    for (const t of data?.templates ?? []) {
      if (t.entry_cost < 100) buckets[0].value += 1
      else if (t.entry_cost < 500) buckets[1].value += 1
      else if (t.entry_cost < 2000) buckets[2].value += 1
      else buckets[3].value += 1
    }
    return buckets
  }, [data])

  function toggleSort(key: SortKey) {
    if (key === sortBy) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-[0_2px_12px_rgba(16,24,40,0.06)] backdrop-blur">
        <div className="inline-flex items-center gap-2 px-1 text-[12px] font-bold uppercase tracking-wider text-[#7B7B7B]">
          <Activity className="size-4 text-[#7A37F0]" />
          Период
        </div>
        <div className="inline-flex flex-wrap gap-1 rounded-full bg-[#F5F6F7] p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              className={[
                'rounded-full px-3.5 py-1.5 text-[12.5px] font-bold transition-all duration-300',
                period === opt.value
                  ? 'bg-[#111] text-white shadow-[0_4px_12px_rgba(16,24,40,0.18)]'
                  : 'text-[#7B7B7B] hover:text-[#111]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Всего сыграно"
          value={kpis.totalCompleted.toLocaleString('ru-RU')}
          hint={historical ? `за всё время: ${historical.total_rooms.toLocaleString('ru-RU')}` : undefined}
          Icon={Trophy}
          tone="yellow"
        />
        <KpiCard
          label="Активных шаблонов"
          value={kpis.activeCount.toLocaleString('ru-RU')}
          hint={`архив: ${kpis.archivedCount}`}
          Icon={Layers}
          tone="purple"
        />
        <KpiCard
          label="Средний игрок/комната"
          value={historical ? historical.avg_real_players_per_room.toFixed(1) : '—'}
          hint="по живым игрокам"
          Icon={Users}
          tone="green"
        />
        <KpiCard
          label="Средний взнос"
          value={`${(historical?.avg_entry_cost ?? kpis.avgEntry).toLocaleString('ru-RU')} STL`}
          hint={`в шаблонах: ${kpis.avgEntry.toLocaleString('ru-RU')}`}
          Icon={Coins}
          tone="pink"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#ECECEC] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.04)] lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-black text-[#111]">Топ шаблонов по сыгранным комнатам</h3>
              <p className="text-[12px] text-[#9A9A9A]">Самые востребованные настройки игры</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-[#FFF7CF]">
              <BarChart3 className="size-5 text-[#A07700]" />
            </span>
          </div>
          <BarChart items={topByCompleted} emptyText="Пока никто не сыграл." />
        </div>

        <div className="rounded-2xl border border-[#ECECEC] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-black text-[#111]">Жизненный цикл</h3>
              <p className="text-[12px] text-[#9A9A9A]">Активные vs архивные</p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-[#E6F8EE]">
              <PieChart className="size-5 text-[#0F7A3A]" />
            </span>
          </div>
          <DonutChart
            slices={lifecycleSlices}
            centerLabel="всего"
            centerValue={String(kpis.activeCount + kpis.archivedCount)}
            size={160}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-[#ECECEC] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-black text-[#111]">Распределение по цене входа</h3>
            <p className="text-[12px] text-[#9A9A9A]">Сколько шаблонов в каждом диапазоне</p>
          </div>
          <span className="grid size-9 place-items-center rounded-xl bg-[#F1E8FF]">
            <PieChart className="size-5 text-[#4F1FB3]" />
          </span>
        </div>
        <DonutChart slices={priceBuckets} centerLabel="шаблонов" size={160} />
      </div>

      {/* Templates table */}
      <div className="rounded-2xl border border-[#ECECEC] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2F3F5] p-5">
          <div>
            <h3 className="text-[15px] font-black text-[#111]">Подробно по шаблонам</h3>
            <p className="text-[12px] text-[#9A9A9A]">Кликните на строку, чтобы увидеть детали</p>
          </div>
        </div>

        {isLoading ? <p className="p-5 text-[13px] text-[#9A9A9A]">Загрузка…</p> : null}
        {error ? <p className="p-5 text-[13px] text-[#C42929]">Не удалось загрузить статистику.</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead className="bg-[#FAFBFC] text-[#7B7B7B]">
              <tr>
                <Th>ID</Th>
                <Th>Название</Th>
                <Th>Тип</Th>
                <SortableTh label="Min/Max" active={sortBy === 'max_players'} order={sortOrder} onClick={() => toggleSort('max_players')} />
                <SortableTh label="Взнос" active={sortBy === 'entry_cost'} order={sortOrder} onClick={() => toggleSort('entry_cost')} />
                <SortableTh label="%" active={sortBy === 'winner_pct'} order={sortOrder} onClick={() => toggleSort('winner_pct')} />
                <SortableTh label="Сыграно" active={sortBy === 'completed_rooms'} order={sortOrder} onClick={() => toggleSort('completed_rooms')} />
                <Th>Статус</Th>
                <Th aria-label="open" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.template_id} className="border-t border-[#F2F3F5] text-[#111] transition-colors hover:bg-[#FFFBE5]">
                  <Td><span className="font-bold text-[#7B7B7B]">#{t.template_id}</span></Td>
                  <Td className="font-semibold">{t.name?.trim() ? t.name : <span className="text-[#9A9A9A]">—</span>}</Td>
                  <Td>{gameTypeLabel(t.game_type)}</Td>
                  <Td>{t.min_players}/{t.max_players}</Td>
                  <Td>{t.entry_cost.toLocaleString('ru-RU')} STL</Td>
                  <Td>{t.winner_pct}%</Td>
                  <Td><span className="font-bold">{t.completed_rooms}</span></Td>
                  <Td>
                    {t.deleted_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEDED] px-2.5 py-0.5 text-[11px] font-bold text-[#C42929]">
                        <span className="size-1.5 rounded-full bg-[#C42929]" />
                        Удалён
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F8EE] px-2.5 py-0.5 text-[11px] font-bold text-[#0F7A3A]">
                        <span className="size-1.5 rounded-full bg-[#1AB75A]" />
                        Активен
                      </span>
                    )}
                  </Td>
                  <Td className="text-right">
                    <Link
                      className="inline-flex items-center gap-1 rounded-full bg-[#111] px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#2A2A2A]"
                      to={adminStatsTemplatePath(t.template_id)}
                    >
                      Открыть →
                    </Link>
                  </Td>
                </tr>
              ))}
              {templates.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#9A9A9A]">
                    За выбранный период данных нет.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function sortTemplates(arr: AdminTemplateListItem[], key: SortKey, order: 'asc' | 'desc'): AdminTemplateListItem[] {
  const sign = order === 'asc' ? 1 : -1
  const copy = [...arr]
  copy.sort((a, b) => {
    const av = (a as unknown as Record<string, number | string>)[key] ?? 0
    const bv = (b as unknown as Record<string, number | string>)[key] ?? 0
    if (av < bv) return -1 * sign
    if (av > bv) return 1 * sign
    return 0
  })
  return copy
}

function Th({ children, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th {...rest} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">
      {children}
    </th>
  )
}

function SortableTh({
  label,
  active,
  order,
  onClick,
}: {
  label: string
  active: boolean
  order: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">
      <button
        type="button"
        onClick={onClick}
        className={['inline-flex items-center gap-1 transition-colors', active ? 'text-[#111]' : 'text-[#7B7B7B] hover:text-[#111]'].join(' ')}
      >
        {label}
        {active ? <span className="text-[#FFC400]">{order === 'asc' ? '▲' : '▼'}</span> : null}
      </button>
    </th>
  )
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3 ${className ?? ''}`}>{children}</td>
}
