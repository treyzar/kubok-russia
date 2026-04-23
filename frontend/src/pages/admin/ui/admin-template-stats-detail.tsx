import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { type AuthUser } from '@entities/user'
import { type AdminTimePeriod, getAdminTemplateStats } from '@shared/api'
import { Button } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import { routePaths } from '@app/providers/router/config/route-paths'

const PERIOD_OPTIONS: ReadonlyArray<{ value: AdminTimePeriod; label: string }> = [
  { value: 'hour', label: 'Час' },
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'all', label: 'Всё время' },
]

type Props = {
  user: AuthUser
  onLogout: () => void
  onBrandClick: () => void
}

export function AdminTemplateStatsDetailPage({ user, onLogout, onBrandClick }: Props) {
  const params = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const templateId = Number(params.templateId)
  const [period, setPeriod] = useState<AdminTimePeriod>('all')

  const valid = Number.isInteger(templateId) && templateId > 0
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'template-stats', templateId, period],
    queryFn: () => getAdminTemplateStats(templateId, { period }),
    enabled: valid,
  })

  return (
    <main className="fixed inset-0 overflow-y-auto bg-[#0F1014] text-[#F2F3F5]">
      <AppHeader onBrandClick={onBrandClick} onLogout={onLogout} user={user} />
      <div className="mx-auto max-w-[1100px] px-4 py-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(routePaths.admin)}
          className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[#A8E45E] hover:underline"
        >
          <ArrowLeft className="size-4" />
          Назад к админ-панели
        </button>

        {!valid ? <p className="text-red-400">Некорректный ID шаблона.</p> : null}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.6rem] font-semibold">Шаблон #{templateId} — статистика</h1>
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

        {data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Сыграно комнат" value={data.completed_rooms.toLocaleString('ru-RU')} />
            <Metric label="Всего реальных игроков" value={data.total_real_players.toLocaleString('ru-RU')} />
            <Metric label="Всего ботов" value={data.total_bots.toLocaleString('ru-RU')} />
            <Metric label="Среднее реальных игроков / комнату" value={fmt(data.avg_real_players_per_room)} />
            <Metric label="Победы реальных игроков" value={data.real_player_wins.toLocaleString('ru-RU')} />
            <Metric label="Победы ботов" value={data.bot_wins.toLocaleString('ru-RU')} />
            <Metric label="Сумма бустов (всего)" value={data.total_boost_amount.toLocaleString('ru-RU')} />
            <Metric label="Среднее буста / игрока" value={fmt(data.avg_boost_per_player)} />
            <Metric label="Среднее буста / комнату" value={fmt(data.avg_boost_per_room)} />
            <Metric label="Среднее мест / игрока" value={fmt(data.avg_places_per_player)} />
          </div>
        ) : null}

        <div className="mt-6">
          <Link to={routePaths.admin} className="text-sm text-[#9098A8] hover:text-[#A8E45E]">
            ← К списку шаблонов
          </Link>
        </div>
      </div>
    </main>
  )
}

function fmt(n: number): string {
  return Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#2B2C30] bg-[#181920] p-4">
      <p className="text-[11px] uppercase tracking-wide text-[#9098A8]">{label}</p>
      <p className="mt-1 text-[1.4rem] font-semibold text-[#F2F3F5]">{value}</p>
    </div>
  )
}
