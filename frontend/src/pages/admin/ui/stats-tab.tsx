import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { adminStatsTemplatePath } from '@app/providers/router/config/route-paths'
import {
  type AdminTemplateListItem,
  type AdminTimePeriod,
  listAdminTemplates,
} from '@shared/api'
import { Badge, Button } from '@shared/ui'

const PERIOD_OPTIONS: ReadonlyArray<{ value: AdminTimePeriod; label: string }> = [
  { value: 'hour', label: 'Час' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё время' },
]

type SortKey = 'completed_rooms' | 'entry_cost' | 'winner_pct' | 'max_players' | 'created_at'

export function StatsTab() {
  const [period, setPeriod] = useState<AdminTimePeriod>('all')
  const [sortBy, setSortBy] = useState<SortKey>('completed_rooms')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'templates', 'stats', period],
    queryFn: () => listAdminTemplates({ period }),
  })

  const templates = useMemo(() => sortTemplates(data?.templates ?? [], sortBy, sortOrder), [data, sortBy, sortOrder])

  function toggleSort(key: SortKey) {
    if (key === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.25rem] font-semibold text-[#F2F3F5]">Статистика по шаблонам</h2>
        <div className="flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={period === opt.value ? 'default' : 'outline'}
              className={
                period === opt.value
                  ? 'bg-[#A8E45E] text-[#101114] hover:bg-[#B9ED76]'
                  : 'border-[#3A3B45] bg-transparent text-[#DFE1E6] hover:bg-[#23252F]'
              }
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? <p className="text-[#9098A8]">Загрузка…</p> : null}
      {error ? <p className="text-red-400">Не удалось загрузить статистику.</p> : null}

      <div className="overflow-x-auto rounded-md border border-[#2B2C30]">
        <table className="w-full min-w-[800px] text-left text-[14px]">
          <thead className="bg-[#1B1C22] text-[#9098A8]">
            <tr>
              <Th>ID</Th>
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
              <tr key={t.template_id} className="border-t border-[#2B2C30] text-[#F2F3F5]">
                <Td>#{t.template_id}</Td>
                <Td>{t.game_type === 'fridge' ? 'Ночной жор' : t.game_type}</Td>
                <Td>{t.min_players}/{t.max_players}</Td>
                <Td>{t.entry_cost.toLocaleString('ru-RU')}</Td>
                <Td>{t.winner_pct}%</Td>
                <Td>{t.completed_rooms}</Td>
                <Td>
                  {t.deleted_at ? (
                    <Badge className="bg-[#3A1A1A] text-[#FFB4B4]">Удалён</Badge>
                  ) : (
                    <Badge className="bg-[#1F3A1A] text-[#B5F49A]">Активен</Badge>
                  )}
                </Td>
                <Td className="text-right">
                  <Link
                    className="text-[13px] font-medium text-[#A8E45E] hover:underline"
                    to={adminStatsTemplatePath(t.template_id)}
                  >
                    Открыть →
                  </Link>
                </Td>
              </tr>
            ))}
            {templates.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[#9098A8]">
                  За выбранный период данных нет.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
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
    <th {...rest} className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
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
    <th className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? 'text-[#A8E45E]' : 'text-[#9098A8]'} hover:text-[#A8E45E]`}
      >
        {label}
        {active ? <span>{order === 'asc' ? '▲' : '▼'}</span> : null}
      </button>
    </th>
  )
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ''}`}>{children}</td>
}
