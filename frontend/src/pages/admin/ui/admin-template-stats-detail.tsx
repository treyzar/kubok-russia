import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Award,
  Bot,
  Coins,
  Layers,
  PercentCircle,
  TrendingUp,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { type AuthUser } from '@entities/user'
import { type AdminTimePeriod, getAdminTemplateStats } from '@shared/api'
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

type Tone = 'yellow' | 'purple' | 'green' | 'pink' | 'blue'

const TONE: Record<Tone, { bg: string; fg: string }> = {
  yellow: { bg: 'bg-[#FFF7CF]', fg: 'text-[#A07700]' },
  purple: { bg: 'bg-[#F1E8FF]', fg: 'text-[#4F1FB3]' },
  green: { bg: 'bg-[#E6F8EE]', fg: 'text-[#0F7A3A]' },
  pink: { bg: 'bg-[#FFE8F2]', fg: 'text-[#A8155F]' },
  blue: { bg: 'bg-[#E1EEFF]', fg: 'text-[#1F4FA0]' },
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

  const totalWins = (data?.real_player_wins ?? 0) + (data?.bot_wins ?? 0)
  const realWinPct = totalWins > 0 ? ((data?.real_player_wins ?? 0) / totalWins) * 100 : 0
  const totalParticipants = (data?.total_real_players ?? 0) + (data?.total_bots ?? 0)
  const realPlayerShare = totalParticipants > 0 ? ((data?.total_real_players ?? 0) / totalParticipants) * 100 : 0

  return (
    <main className="relative min-h-svh text-[#111]">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#F7F8FA]" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage: 'linear-gradient(180deg, #FFF7CF 0%, #FFE680 38%, #F7F8FA 100%)',
          opacity: 0.55,
        }}
      />

      <AppHeader onBrandClick={onBrandClick} onLogout={onLogout} user={user} />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(routePaths.admin)}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[12.5px] font-bold text-[#111] shadow-[0_2px_8px_rgba(16,24,40,0.06)] backdrop-blur transition hover:bg-white"
        >
          <ArrowLeft className="size-4" />
          Назад в админ-панель
        </button>

        {!valid ? (
          <div className="rounded-2xl border border-[#FFD0D0] bg-[#FFEDED] p-5 text-[14px] text-[#9A1F1F]">
            Некорректный ID шаблона.
          </div>
        ) : null}

        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#7A37F0] shadow-[0_2px_8px_rgba(16,24,40,0.06)] backdrop-blur">
              Статистика шаблона
            </span>
            <h1 className="mt-2 text-[clamp(1.6rem,2.5vw,2rem)] font-black leading-tight text-[#111]">
              Шаблон #{templateId}
            </h1>
            <p className="mt-1 text-[14px] text-[#7B7B7B]">
              Подробные показатели по всем комнатам, созданным из этого шаблона.
            </p>
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-full bg-white/85 p-1 shadow-[0_2px_12px_rgba(16,24,40,0.06)] backdrop-blur">
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
        </header>

        {isLoading ? (
          <div className="rounded-2xl border border-[#ECECEC] bg-white p-8 text-center text-[14px] text-[#9A9A9A]">
            Загружаем статистику…
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-[#FFD0D0] bg-[#FFEDED] p-5 text-[14px] text-[#9A1F1F]">
            Не удалось загрузить статистику. Попробуйте обновить страницу.
          </div>
        ) : null}

        {data ? (
          <div className="space-y-5">
            {/* Top KPI band */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                Icon={Trophy}
                tone="yellow"
                label="Сыграно комнат"
                value={data.completed_rooms.toLocaleString('ru-RU')}
                hint={`за период «${PERIOD_OPTIONS.find((p) => p.value === period)?.label}»`}
              />
              <Kpi
                Icon={Users}
                tone="green"
                label="Реальных игроков"
                value={data.total_real_players.toLocaleString('ru-RU')}
                hint={`${realPlayerShare.toFixed(1)}% от всех участников`}
              />
              <Kpi
                Icon={Bot}
                tone="purple"
                label="Ботов"
                value={data.total_bots.toLocaleString('ru-RU')}
                hint={`${(100 - realPlayerShare).toFixed(1)}% от всех участников`}
              />
              <Kpi
                Icon={Coins}
                tone="pink"
                label="Сумма бустов"
                value={data.total_boost_amount.toLocaleString('ru-RU')}
                hint="общая по всем комнатам"
              />
            </div>

            {/* Wins distribution */}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-[#ECECEC] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.04)] lg:col-span-2">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-black text-[#111]">Кто чаще выигрывает</h3>
                    <p className="text-[12px] text-[#9A9A9A]">
                      Распределение побед между живыми игроками и ботами.
                    </p>
                  </div>
                  <span className={`grid size-9 place-items-center rounded-xl ${TONE.green.bg}`}>
                    <Award className={`size-5 ${TONE.green.fg}`} />
                  </span>
                </div>
                <WinsBar
                  realWins={data.real_player_wins}
                  botWins={data.bot_wins}
                  realPct={realWinPct}
                />
              </div>
              <div className="rounded-2xl border border-[#ECECEC] bg-white p-5 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-black text-[#111]">Доля живых побед</h3>
                    <p className="text-[12px] text-[#9A9A9A]">от всех завершённых раундов</p>
                  </div>
                  <span className={`grid size-9 place-items-center rounded-xl ${TONE.yellow.bg}`}>
                    <PercentCircle className={`size-5 ${TONE.yellow.fg}`} />
                  </span>
                </div>
                <p className="text-[44px] font-black tabular-nums leading-none text-[#111]">
                  {realWinPct.toFixed(0)}<span className="text-[20px] text-[#7B7B7B]">%</span>
                </p>
                <p className="mt-1 text-[12.5px] text-[#7B7B7B]">
                  Живых: <b className="text-[#0F7A3A]">{data.real_player_wins}</b> · Ботов:{' '}
                  <b className="text-[#7A37F0]">{data.bot_wins}</b>
                </p>
              </div>
            </div>

            {/* Average metrics */}
            <div>
              <h3 className="mb-3 text-[13px] font-black uppercase tracking-wider text-[#111]">
                Усреднённые показатели
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SoftStat Icon={User} tone="green" label="Игроков на комнату" value={fmt(data.avg_real_players_per_room)} />
                <SoftStat Icon={Layers} tone="blue" label="Мест на игрока" value={fmt(data.avg_places_per_player)} />
                <SoftStat Icon={Zap} tone="pink" label="Буст на игрока" value={fmt(data.avg_boost_per_player)} suffix="STL" />
                <SoftStat Icon={TrendingUp} tone="yellow" label="Буст на комнату" value={fmt(data.avg_boost_per_room)} suffix="STL" />
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <Link to={routePaths.admin} className="text-[13px] font-semibold text-[#7B7B7B] hover:text-[#111]">
            ← К списку шаблонов
          </Link>
        </div>
      </div>
    </main>
  )
}

function Kpi({
  Icon,
  tone,
  label,
  value,
  hint,
}: {
  Icon: React.ComponentType<{ className?: string }>
  tone: Tone
  label: string
  value: string
  hint?: string
}) {
  const t = TONE[tone]
  return (
    <div className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B7B7B]">{label}</p>
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${t.bg}`}>
          <Icon className={`size-4 ${t.fg}`} />
        </span>
      </div>
      <p className="mt-1.5 text-[26px] font-black leading-none text-[#111] tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-[11.5px] text-[#9A9A9A]">{hint}</p> : null}
    </div>
  )
}

function SoftStat({
  Icon,
  tone,
  label,
  value,
  suffix,
}: {
  Icon: React.ComponentType<{ className?: string }>
  tone: Tone
  label: string
  value: string
  suffix?: string
}) {
  const t = TONE[tone]
  return (
    <div className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-lg ${t.bg}`}>
          <Icon className={`size-3.5 ${t.fg}`} />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B7B7B]">{label}</p>
      </div>
      <p className="mt-1.5 text-[20px] font-black leading-none text-[#111] tabular-nums">
        {value}
        {suffix ? <span className="ml-1 text-[12px] font-bold text-[#7B7B7B]">{suffix}</span> : null}
      </p>
    </div>
  )
}

function WinsBar({ realWins, botWins, realPct }: { realWins: number; botWins: number; realPct: number }) {
  const total = realWins + botWins
  if (total === 0) {
    return <p className="text-[13px] text-[#9A9A9A]">Пока никто не сыграл.</p>
  }
  const botPct = 100 - realPct
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#F2F3F5]">
        <div
          className="h-full bg-gradient-to-r from-[#1AB75A] to-[#15A04E] transition-all duration-700"
          style={{ width: `${realPct}%` }}
        />
        <div
          className="h-full bg-gradient-to-r from-[#7A37F0] to-[#5E25C0] transition-all duration-700"
          style={{ width: `${botPct}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#1AB75A]" />
          <span className="text-[#7B7B7B]">Живые игроки</span>
          <span className="ml-auto font-black text-[#111] tabular-nums">{realWins}</span>
          <span className="text-[#9A9A9A]">({realPct.toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-[#7A37F0]" />
          <span className="text-[#7B7B7B]">Боты</span>
          <span className="ml-auto font-black text-[#111] tabular-nums">{botWins}</span>
          <span className="text-[#9A9A9A]">({botPct.toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  )
}

function fmt(n: number): string {
  return Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}
