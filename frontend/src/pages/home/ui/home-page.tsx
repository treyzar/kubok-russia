import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Clock,
  Coins,
  Dice5,
  Filter,
  Flame,
  Loader2,
  Lock,
  Refrigerator,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react'

import { resolveApiUserId } from '@processes/auth-session'
import { ApiClientError, joinRoom } from '@shared/api'
import { Button } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import { type HomePageProps } from '../model'
import { useGameRooms, useQuickGame, type RoomsSortKey } from '../lib'
import { LastGamesSection } from './last-games-section'

type Mechanic = {
  id: string
  name: string
  short: string
  description: string
  badge: string
  badgeBg: string
  heroFrom: string
  heroTo: string
  available: boolean
  Icon: typeof Refrigerator
}

const MECHANICS: Mechanic[] = [
  {
    id: 'fridge',
    name: 'Ночной жор',
    short: 'Открой холодильник первым',
    description:
      'Быстрый раунд: до 6 игроков врываются в виртуальный холодильник. Кто схватит самое жирное блюдо — забирает фонд STL.',
    badge: 'HOT',
    badgeBg: 'bg-[#E5008C] text-white',
    heroFrom: '#FFD400',
    heroTo: '#FF8A00',
    available: true,
    Icon: Refrigerator,
  },
  {
    id: 'wheel',
    name: 'Колесо удачи',
    short: 'Класический спин-раунд',
    description:
      'Колесо вращается, чем больше буст — тем больше сектор. В разработке: запуск в следующем спринте.',
    badge: 'СКОРО',
    badgeBg: 'bg-[#1666EC] text-white',
    heroFrom: '#1666EC',
    heroTo: '#0B3C9E',
    available: false,
    Icon: Dice5,
  },
  {
    id: 'duel',
    name: 'Дуэль карт',
    short: '1×1 битва на бонусы',
    description:
      'Два игрока, одна колода, всё решает один раунд. В разработке: проектируем матчмейкинг для дуэлей.',
    badge: 'СКОРО',
    badgeBg: 'bg-[#1AB75A] text-white',
    heroFrom: '#1AB75A',
    heroTo: '#0F7A3A',
    available: false,
    Icon: Swords,
  },
]

const SORT_OPTIONS: Array<{ id: RoomsSortKey; label: string }> = [
  { id: 'jackpot_desc', label: 'Самый крупный фонд' },
  { id: 'entry_asc', label: 'Сначала дешёвые' },
  { id: 'players_asc', label: 'Меньше мест — быстрее старт' },
]

function formatStl(value: number): string {
  return `${value.toLocaleString('ru-RU')} STL`
}

export function HomePage({ onBrandClick, onJoinGame, onJoinLobby, user, onLogout }: HomePageProps) {
  const [selectedId, setSelectedId] = useState<string>(MECHANICS[0].id)
  const [sort, setSort] = useState<RoomsSortKey>('jackpot_desc')
  const [maxEntry, setMaxEntry] = useState<number | undefined>(undefined)
  const [joiningRoomId, setJoiningRoomId] = useState<number | null>(null)
  const [joinError, setJoinError] = useState('')

  const selected = useMemo(() => MECHANICS.find((m) => m.id === selectedId) ?? MECHANICS[0], [selectedId])

  const {
    rooms,
    totalCount,
    isLoading: isRoomsLoading,
    isError: isRoomsError,
  } = useGameRooms({ sort, maxEntryCost: maxEntry })

  const { handleQuickGame, isLoading: isQuickGameLoading, error: quickGameError } = useQuickGame({
    userId: user.id,
    userName: user.name,
    userBalance: user.balance,
    onJoinLobby,
  })

  async function handleJoinRoom(roomId: number, entryCost: number): Promise<void> {
    if (!selected.available) return
    if (user.balance < entryCost) {
      setJoinError(`Недостаточно баллов: нужно ${entryCost} STL, доступно ${user.balance} STL`)
      return
    }
    setJoiningRoomId(roomId)
    setJoinError('')
    try {
      const apiUserId = await resolveApiUserId(user.id, user.name, user.balance)
      await joinRoom(roomId, { user_id: apiUserId, places: 1 })
      onJoinLobby(roomId)
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 402) {
        const d = err.details as { needed?: number; available?: number } | null
        setJoinError(
          d?.needed != null
            ? `Недостаточно баллов: нужно ${d.needed} STL, доступно ${d.available ?? 0} STL`
            : 'Недостаточно баллов для входа в комнату.',
        )
      } else if (err instanceof ApiClientError && err.status === 409) {
        setJoinError('Комната уже заполнена. Выберите другую.')
      } else {
        setJoinError(err instanceof Error ? err.message : 'Не удалось войти в комнату.')
      }
    } finally {
      setJoiningRoomId(null)
    }
  }

  return (
    <main className="min-h-svh bg-[#F7F8FA] text-[#111]">
      {/* Top live strip */}
      <div className="border-b border-[#ECECEC] bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 overflow-x-auto px-4 py-2 text-[13px] sm:px-6 lg:px-8">
          <span className="shrink-0 inline-flex items-center gap-1.5 font-semibold text-[#E5008C]">
            <span className="size-1.5 rounded-full bg-[#E5008C]" />
            LIVE
          </span>
          <span className="shrink-0 text-[#7B7B7B]">Сейчас активно:</span>
          <span className="shrink-0 font-semibold text-[#111]">
            {totalCount} {pluralRooms(totalCount)}
          </span>
          <span className="shrink-0 text-[#ECECEC]">•</span>
          <span className="shrink-0 text-[#7B7B7B]">Ваш баланс:</span>
          <span className="shrink-0 inline-flex items-center gap-1 font-bold text-[#111]">
            <Coins className="size-3.5 text-[#FFC400]" />
            {formatStl(user.balance)}
          </span>
        </div>
      </div>

      <AppHeader onBrandClick={onBrandClick} onLogout={onLogout} user={user} />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar — список механик */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#ECECEC] bg-white p-3 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
              <p className="px-2 pt-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#7B7B7B]">
                Игровые механики
              </p>
              <ul className="space-y-1">
                {MECHANICS.map((m) => {
                  const isActive = m.id === selectedId
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        className={[
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                          isActive
                            ? 'bg-[#FFF6CC] ring-1 ring-[#FFD400]'
                            : 'hover:bg-[#F5F6F7]',
                        ].join(' ')}
                      >
                        <span
                          className="grid size-9 shrink-0 place-items-center rounded-lg text-white"
                          style={{ background: `linear-gradient(135deg, ${m.heroFrom}, ${m.heroTo})` }}
                        >
                          <m.Icon className="size-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-[14px] font-semibold text-[#111]">{m.name}</span>
                            {!m.available && <Lock className="size-3 text-[#9A9A9A]" />}
                          </span>
                          <span className="block truncate text-[11px] text-[#7B7B7B]">{m.short}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Quick game CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-[#111] to-[#2A2A2A] p-5 text-white shadow-[0_2px_12px_rgba(16,24,40,0.08)]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#FFD400]">Быстрая игра</p>
              <h3 className="mt-1.5 text-[18px] font-black leading-tight">
                Подберём комнату <br /> за пару секунд
              </h3>
              <p className="mt-2 text-[12px] text-white/70">
                Найдём свободное место в подходящей комнате.
              </p>
              <Button
                className="mt-4 h-11 w-full gap-2 rounded-full bg-[#FFD400] text-[14px] font-bold text-[#111] shadow-[0_8px_20px_rgba(255,212,0,0.35)] hover:bg-[#FFE040] disabled:opacity-60"
                disabled={isQuickGameLoading}
                onClick={handleQuickGame}
                type="button"
              >
                {isQuickGameLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Ищем...
                  </>
                ) : (
                  <>
                    Найти комнату <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
              {quickGameError && <p className="mt-2 text-center text-[12px] text-[#FF8B8B]">{quickGameError}</p>}
            </div>
          </aside>

          {/* Main content — динамика по выбранной механике */}
          <section className="space-y-6">
            {/* Hero выбранной механики */}
            <div
              className="relative overflow-hidden rounded-3xl px-6 py-8 text-white shadow-[0_18px_48px_rgba(16,24,40,0.18)] sm:px-10 sm:py-10"
              style={{ background: `linear-gradient(135deg, ${selected.heroFrom}, ${selected.heroTo})` }}
            >
              <div className="relative z-10 max-w-[640px]">
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur">
                    <selected.Icon className="size-3.5" />
                    {selected.name}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${selected.badgeBg}`}>
                    {selected.badge}
                  </span>
                </div>
                <h1 className="mt-4 text-[clamp(1.75rem,4vw,2.6rem)] font-black leading-[1.05]">
                  {selected.available ? 'Раунд за минуту. Фонд — до 25 000 STL' : 'Эта механика в разработке'}
                </h1>
                <p className="mt-3 text-[clamp(0.95rem,1.2vw,1.05rem)] font-medium text-white/90">
                  {selected.description}
                </p>
                {selected.available ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      className="h-11 gap-2 rounded-full bg-white px-5 text-[15px] font-bold text-[#111] shadow-[0_8px_24px_rgba(0,0,0,0.18)] hover:bg-[#FFF6CC]"
                      onClick={onJoinGame}
                      type="button"
                    >
                      Все комнаты
                      <ArrowRight className="size-4" />
                    </Button>
                    <Button
                      className="h-11 gap-2 rounded-full bg-black/25 px-5 text-[15px] font-semibold text-white backdrop-blur hover:bg-black/35"
                      disabled={isQuickGameLoading}
                      onClick={handleQuickGame}
                      type="button"
                    >
                      Быстрая игра
                    </Button>
                  </div>
                ) : (
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-black/25 px-4 py-2 text-[13px] font-semibold backdrop-blur">
                    <Lock className="size-4" />
                    В стадии реализации
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute -top-12 -right-10 h-72 w-72 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute bottom-[-3rem] right-32 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            </div>

            {/* Контент в зависимости от наличия механики */}
            {selected.available ? (
              <>
                {/* Фильтры */}
                <div className="rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 text-[13px] font-bold text-[#111]">
                      <Filter className="size-4 text-[#7B7B7B]" />
                      Фильтры
                    </div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F6F7] p-1">
                      {[undefined, 100, 500, 2000].map((cap) => (
                        <button
                          key={String(cap)}
                          type="button"
                          onClick={() => setMaxEntry(cap)}
                          className={[
                            'rounded-full px-3 py-1.5 text-[12px] font-semibold transition',
                            maxEntry === cap ? 'bg-[#FFD400] text-[#111]' : 'text-[#7B7B7B] hover:text-[#111]',
                          ].join(' ')}
                        >
                          {cap == null ? 'Любая цена' : `до ${cap} STL`}
                        </button>
                      ))}
                    </div>
                    <div className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#F5F6F7] p-1">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSort(opt.id)}
                          className={[
                            'rounded-full px-3 py-1.5 text-[12px] font-semibold transition',
                            sort === opt.id ? 'bg-[#111] text-white' : 'text-[#7B7B7B] hover:text-[#111]',
                          ].join(' ')}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {joinError && (
                    <p className="mt-3 rounded-xl bg-[#FFEDED] px-3 py-2 text-[13px] font-medium text-[#C42929]">
                      {joinError}
                    </p>
                  )}
                </div>

                {/* Сетка комнат */}
                <div>
                  <div className="mb-3 flex items-end justify-between">
                    <h2 className="text-[20px] font-black text-[#111]">Доступные комнаты</h2>
                    <span className="text-[13px] text-[#7B7B7B]">{rooms.length} найдено</span>
                  </div>
                  {isRoomsLoading && (
                    <div className="grid place-items-center rounded-2xl border border-dashed border-[#ECECEC] bg-white py-10 text-[#7B7B7B]">
                      <Loader2 className="size-5 animate-spin" />
                    </div>
                  )}
                  {isRoomsError && (
                    <p className="rounded-2xl border border-[#FFD2D2] bg-[#FFF5F5] p-6 text-center text-[#C42929]">
                      Не удалось загрузить список комнат.
                    </p>
                  )}
                  {!isRoomsLoading && !isRoomsError && rooms.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[#ECECEC] bg-white p-10 text-center">
                      <Sparkles className="mx-auto size-6 text-[#FFC400]" />
                      <p className="mt-2 text-[15px] font-semibold text-[#111]">
                        Подходящих комнат сейчас нет
                      </p>
                      <p className="mt-1 text-[13px] text-[#7B7B7B]">
                        Попробуйте сменить фильтры или запустите быструю игру.
                      </p>
                    </div>
                  )}
                  {!isRoomsLoading && !isRoomsError && rooms.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {rooms.map((room) => {
                        const fund = room.jackpot || room.entry_cost * room.players_needed
                        const isJoining = joiningRoomId === room.room_id
                        const cantAfford = user.balance < room.entry_cost
                        return (
                          <article
                            key={room.room_id}
                            className="group flex flex-col gap-3 rounded-2xl border border-[#ECECEC] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#FFD400] hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)]"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B7B7B]">
                                  Комната #{room.room_id}
                                </p>
                                <p className="mt-1 text-[22px] font-black leading-tight text-[#111]">
                                  {formatStl(fund)}
                                </p>
                                <p className="text-[11px] text-[#7B7B7B]">Призовой фонд</p>
                              </div>
                              <span
                                className="grid size-10 place-items-center rounded-xl text-white"
                                style={{ background: `linear-gradient(135deg, ${selected.heroFrom}, ${selected.heroTo})` }}
                              >
                                <selected.Icon className="size-5" />
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#FAFBFC] p-2.5 text-center">
                              <Stat icon={<Coins className="size-3.5" />} label="Вход" value={`${room.entry_cost} STL`} />
                              <Stat icon={<Users className="size-3.5" />} label="Мест" value={`${room.players_needed}`} />
                              <Stat
                                icon={<Clock className="size-3.5" />}
                                label="Раунд"
                                value={`${room.round_duration_seconds}с`}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1AB75A]">
                                <Flame className="size-3" />
                                Приз победителю: {room.winner_pct}%
                              </span>
                              <Button
                                type="button"
                                disabled={isJoining || cantAfford}
                                onClick={() => handleJoinRoom(room.room_id, room.entry_cost)}
                                className="h-9 gap-1 rounded-full bg-[#FFD400] px-4 text-[13px] font-bold text-[#111] shadow-none hover:bg-[#FFE040] disabled:bg-[#F5F6F7] disabled:text-[#9A9A9A]"
                              >
                                {isJoining ? <Loader2 className="size-3.5 animate-spin" /> : 'Войти'}
                              </Button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Журнал */}
                <div className="rounded-3xl border border-[#ECECEC] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
                  <LastGamesSection />
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-[#ECECEC] bg-white p-10 text-center shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
                <Lock className="mx-auto size-7 text-[#9A9A9A]" />
                <p className="mt-3 text-[18px] font-black text-[#111]">Эта механика в стадии реализации</p>
                <p className="mt-1.5 text-[14px] text-[#7B7B7B]">
                  Скоро появится в платформе. А пока попробуйте «Ночной жор» — основную механику MVP.
                </p>
                <Button
                  type="button"
                  onClick={() => setSelectedId(MECHANICS[0].id)}
                  className="mt-5 h-11 gap-2 rounded-full bg-[#FFD400] px-5 text-[14px] font-bold text-[#111] hover:bg-[#FFE040]"
                >
                  Перейти к «Ночному жору»
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>

      <footer className="mt-10 border-t border-[#ECECEC] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-6 text-[13px] text-[#7B7B7B] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© Столото VIP · Быстрые бонусные игры на STL</p>
          <p>MVP · Хакатон Кубок России по продуктовому программированию</p>
        </div>
      </footer>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#7B7B7B]">
        {icon}
        {label}
      </span>
      <p className="mt-0.5 text-[13px] font-bold text-[#111]">{value}</p>
    </div>
  )
}

function pluralRooms(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'комната'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'комнаты'
  return 'комнат'
}
