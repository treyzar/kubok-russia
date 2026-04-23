import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Coins,
  Filter,
  Flame,
  Loader2,
  Lock,
  Play,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'

import { resolveApiUserId } from '@processes/auth-session'
import { ApiClientError, joinRoom } from '@shared/api'
import type { RoomStatus } from '@shared/types'
import { Button } from '@shared/ui'
import { AppHeader } from '@widgets/header'
import { LobbyPage } from '@pages/lobby'

import { type HomePageProps } from '../model'
import { MECHANICS } from '../model/mechanics'
import { useGameRooms, useQuickGame, type RoomsSortKey } from '../lib'
import { LastGamesSection } from './last-games-section'
import { MechanicSidebar } from './mechanic-sidebar'
import { SegmentedControl } from './segmented-control'

type PriceCap = 'any' | 100 | 500 | 2000
type SeatsBucket = 'any' | 'small' | 'medium' | 'large'

const PRICE_OPTIONS: ReadonlyArray<{ id: PriceCap; label: string }> = [
  { id: 'any', label: 'Любая цена' },
  { id: 100, label: 'до 100' },
  { id: 500, label: 'до 500' },
  { id: 2000, label: 'до 2000' },
]

const SEATS_OPTIONS: ReadonlyArray<{ id: SeatsBucket; label: string }> = [
  { id: 'any', label: 'Все' },
  { id: 'small', label: '2–3' },
  { id: 'medium', label: '4–6' },
  { id: 'large', label: '7+' },
]

const SORT_OPTIONS: ReadonlyArray<{ id: RoomsSortKey; label: string }> = [
  { id: 'jackpot_desc', label: 'Крупный фонд' },
  { id: 'entry_asc', label: 'Дешёвые' },
  { id: 'players_asc', label: 'Меньше мест' },
]

const TRANSITION_MS = 700

function priceCapValue(cap: PriceCap): number | undefined {
  return cap === 'any' ? undefined : cap
}

function seatsMatches(bucket: SeatsBucket, players: number): boolean {
  if (bucket === 'any') return true
  if (bucket === 'small') return players >= 2 && players <= 3
  if (bucket === 'medium') return players >= 4 && players <= 6
  return players >= 7
}

function formatStl(value: number): string {
  return `${value.toLocaleString('ru-RU')} STL`
}

type StatusVisuals = {
  label: string
  textClass: string
  bgClass: string
  dotClass: string
  Icon: typeof UserPlus
  joinable: boolean
  joinLabel: string
}

function statusVisuals(status: RoomStatus): StatusVisuals {
  switch (status) {
    case 'playing':
      return {
        label: 'Идёт игра',
        textClass: 'text-[#7A37F0]',
        bgClass: 'bg-[#F1E8FF]',
        dotClass: 'bg-[#7A37F0]',
        Icon: Play,
        joinable: false,
        joinLabel: 'В игре',
      }
    case 'starting_soon':
      return {
        label: 'Стартует',
        textClass: 'text-[#D77A00]',
        bgClass: 'bg-[#FFF1D6]',
        dotClass: 'bg-[#D77A00]',
        Icon: Flame,
        joinable: true,
        joinLabel: 'Войти',
      }
    case 'new':
    default:
      return {
        label: 'Набор',
        textClass: 'text-[#1AB75A]',
        bgClass: 'bg-[#E6F8EE]',
        dotClass: 'bg-[#1AB75A]',
        Icon: UserPlus,
        joinable: true,
        joinLabel: 'Войти',
      }
  }
}

export function HomePage({
  onBrandClick,
  onJoinGame,
  user,
  onLogout,
  onUserBalanceChange,
}: HomePageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const roomParam = searchParams.get('room')
  const activeRoomId = roomParam !== null && /^\d+$/.test(roomParam)
    ? Number(roomParam)
    : null

  const openLobbyInline = useCallback(
    (roomId: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('room', String(roomId))
        return next
      })
    },
    [setSearchParams],
  )

  const closeLobbyInline = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('room')
      return next
    })
  }, [setSearchParams])

  if (activeRoomId !== null) {
    return (
      <LobbyPage
        onBackToGames={closeLobbyInline}
        onLogout={onLogout}
        onPlayAgain={closeLobbyInline}
        onUserBalanceChange={onUserBalanceChange}
        roomId={activeRoomId}
        user={user}
      />
    )
  }

  return (
    <HomeRoomsView
      onBrandClick={onBrandClick}
      onJoinGame={onJoinGame}
      onJoinLobby={openLobbyInline}
      onLogout={onLogout}
      user={user}
    />
  )
}

type HomeRoomsViewProps = Omit<HomePageProps, 'onUserBalanceChange'>

function HomeRoomsView({ onBrandClick, onJoinGame, onJoinLobby, user, onLogout }: HomeRoomsViewProps) {
  const [selectedId, setSelectedId] = useState<string>(MECHANICS[0].id)
  const [sort, setSort] = useState<RoomsSortKey>('jackpot_desc')
  const [priceCap, setPriceCap] = useState<PriceCap>('any')
  const [seats, setSeats] = useState<SeatsBucket>('any')
  const [onlyAffordable, setOnlyAffordable] = useState<boolean>(false)
  const [joiningRoomId, setJoiningRoomId] = useState<number | null>(null)
  const [joinError, setJoinError] = useState('')

  const selected = useMemo(
    () => MECHANICS.find((m) => m.id === selectedId) ?? MECHANICS[0],
    [selectedId],
  )

  const {
    rooms: baseRooms,
    totalCount,
    isLoading: isRoomsLoading,
    isError: isRoomsError,
  } = useGameRooms({ sort, maxEntryCost: priceCapValue(priceCap) })

  const rooms = useMemo(() => {
    return baseRooms.filter((room) => {
      if (!seatsMatches(seats, room.players_needed)) return false
      if (onlyAffordable && user.balance < room.entry_cost) return false
      return true
    })
  }, [baseRooms, seats, onlyAffordable, user.balance])

  const liveCounts = useMemo<Record<string, number>>(() => {
    return { fridge: totalCount, wheel: 0, duel: 0 }
  }, [totalCount])

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
    <main className="relative min-h-svh text-[#111]">
      {/* Layered backgrounds — one per mechanic, cross-fade via opacity. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[#F7F8FA]" />
      {MECHANICS.map((m) => (
        <div
          key={m.id}
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 ease-out"
          style={{
            opacity: m.id === selected.id ? 1 : 0,
            backgroundImage: `linear-gradient(180deg, ${m.bgFrom} 0%, ${m.bgTo} 38%, #F7F8FA 100%)`,
            transition: `opacity ${TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0.16, 1)`,
          }}
        />
      ))}

      {/* Top live strip */}
      <div className="border-b border-black/5 bg-white/70 backdrop-blur">
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

      <AppHeader
        onBrandClick={onBrandClick}
        onLogout={onLogout}
        user={user}
        activeMechanic={{
          name: selected.name.toUpperCase(),
          letter: selected.letter,
          Icon: selected.Icon,
          from: selected.heroFrom,
          to: selected.heroTo,
          badge: selected.badge,
          badgeBg: selected.badgeBg,
        }}
        liveStatusText={
          selected.available
            ? `${selected.name} · ${liveCounts[selected.id] ?? 0} ${pluralRooms(liveCounts[selected.id] ?? 0)} в эфире`
            : `${selected.name} · скоро в эфире`
        }
      />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-4">
            <MechanicSidebar
              mechanics={MECHANICS}
              selectedId={selectedId}
              onSelect={setSelectedId}
              liveCountByMechanic={liveCounts}
            />

            {/* Quick game CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-[#111] to-[#2A2A2A] p-5 text-white shadow-[0_8px_24px_rgba(16,24,40,0.10)]">
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

          {/* Main content */}
          <section className="space-y-6">
            {/* Hero — layered cross-fade gradients per mechanic. */}
            <div className="relative overflow-hidden rounded-3xl px-6 py-8 text-white shadow-[0_18px_48px_rgba(16,24,40,0.18)] sm:px-10 sm:py-10">
              {MECHANICS.map((m) => (
                <div
                  key={m.id}
                  aria-hidden
                  className="absolute inset-0 ease-out"
                  style={{
                    opacity: m.id === selected.id ? 1 : 0,
                    backgroundImage: `linear-gradient(135deg, ${m.heroFrom}, ${m.heroTo})`,
                    transition: `opacity ${TRANSITION_MS}ms cubic-bezier(0.32, 0.72, 0.16, 1)`,
                  }}
                />
              ))}
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

            {selected.available ? (
              <>
                {/* Filters */}
                <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-[0_8px_24px_rgba(16,24,40,0.06)] backdrop-blur">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                    <div className="inline-flex items-center gap-2 text-[13px] font-bold text-[#111]">
                      <Filter className="size-4 text-[#7B7B7B]" />
                      Фильтры
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="px-1 text-[10.5px] font-bold uppercase tracking-wider text-[#9A9A9A]">
                        Цена входа
                      </span>
                      <SegmentedControl
                        options={PRICE_OPTIONS.map((o) => ({ id: String(o.id), label: o.label }))}
                        value={String(priceCap)}
                        onChange={(id) => setPriceCap(id === 'any' ? 'any' : (Number(id) as PriceCap))}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="px-1 text-[10.5px] font-bold uppercase tracking-wider text-[#9A9A9A]">
                        Игроков
                      </span>
                      <SegmentedControl
                        options={SEATS_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                        value={seats}
                        onChange={(id) => setSeats(id as SeatsBucket)}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="px-1 text-[10.5px] font-bold uppercase tracking-wider text-[#9A9A9A]">
                        Сортировка
                      </span>
                      <SegmentedControl
                        options={SORT_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                        value={sort}
                        onChange={(id) => setSort(id as RoomsSortKey)}
                        highlight="#111"
                        textActive="#fff"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setOnlyAffordable((v) => !v)}
                      className={[
                        'ml-auto inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-200',
                        onlyAffordable
                          ? 'border-[#1AB75A] bg-[#E6F8EE] text-[#0F7A3A] shadow-[0_2px_10px_rgba(26,183,90,0.20)]'
                          : 'border-[#ECECEC] bg-white text-[#7B7B7B] hover:border-[#D5D5D5] hover:text-[#111]',
                      ].join(' ')}
                      aria-pressed={onlyAffordable}
                    >
                      <Wallet className="size-3.5" />
                      По моему балансу
                      <span
                        className={[
                          'relative ml-1 h-4 w-7 rounded-full transition-colors duration-200',
                          onlyAffordable ? 'bg-[#1AB75A]' : 'bg-[#D5D5D5]',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'absolute top-0.5 size-3 rounded-full bg-white shadow transition-all duration-200',
                            onlyAffordable ? 'left-3.5' : 'left-0.5',
                          ].join(' ')}
                        />
                      </span>
                    </button>
                  </div>

                  {joinError && (
                    <p className="mt-3 rounded-xl bg-[#FFEDED] px-3 py-2 text-[13px] font-medium text-[#C42929]">
                      {joinError}
                    </p>
                  )}
                </div>

                {/* Room grid */}
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
                        const winnerPrize = Math.round((fund * room.winner_pct) / 100)
                        const current = Math.min(room.current_players, room.players_needed)
                        const fillRatio = room.players_needed > 0 ? current / room.players_needed : 0
                        const status = statusVisuals(room.status)
                        const isJoining = joiningRoomId === room.room_id
                        const cantAfford = user.balance < room.entry_cost
                        const StatusIcon = status.Icon
                        return (
                          <article
                            key={room.room_id}
                            className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[#ECECEC] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#FFD400] hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)]"
                          >
                            {/* Header: room id + status badge + game-type icon */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B7B7B] truncate">
                                  Комната #{room.room_id}
                                </p>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.bgClass} ${status.textClass}`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${status.dotClass} ${
                                      room.status === 'starting_soon' ? 'animate-pulse' : ''
                                    }`}
                                  />
                                  <StatusIcon className="size-2.5" />
                                  {status.label}
                                </span>
                              </div>
                              <span
                                className="grid size-10 shrink-0 place-items-center rounded-xl text-white"
                                style={{
                                  background: `linear-gradient(135deg, ${selected.heroFrom}, ${selected.heroTo})`,
                                }}
                              >
                                <selected.Icon className="size-5" />
                              </span>
                            </div>

                            {/* Jackpot — large, central */}
                            <div className="rounded-2xl bg-gradient-to-br from-[#FFF7CF] via-[#FFEEA8] to-[#FFE680] px-4 py-3 text-center shadow-[inset_0_0_0_1px_rgba(255,196,0,0.35)]">
                              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7A5A00]">
                                Джекпот
                              </p>
                              <p className="mt-0.5 text-[clamp(28px,3vw,34px)] font-black leading-none text-[#1A1100] tabular-nums tracking-tight">
                                {formatStl(fund)}
                              </p>
                            </div>

                            {/* Players + entry row */}
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#FAFBFC] p-2.5">
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#7B7B7B]">
                                  <Users className="size-3.5" />
                                  Игроки
                                </span>
                                <p className="mt-0.5 text-[14px] font-bold text-[#111]">
                                  <span className="text-[#111]">{current}</span>
                                  <span className="text-[#9A9A9A]">/{room.players_needed}</span>
                                </p>
                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#ECECEC]">
                                  <div
                                    className="h-full rounded-full bg-[#1AB75A] transition-all duration-500"
                                    style={{ width: `${Math.min(100, fillRatio * 100)}%` }}
                                  />
                                </div>
                              </div>
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#7B7B7B]">
                                  <Coins className="size-3.5" />
                                  Вход
                                </span>
                                <p className="mt-0.5 text-[14px] font-bold text-[#111]">{room.entry_cost} STL</p>
                                {cantAfford && (
                                  <p className="mt-1 text-[10px] font-semibold text-[#C42929]">
                                    Не хватает {room.entry_cost - user.balance} STL
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Action */}
                            <div className="flex items-center justify-end">
                              <Button
                                type="button"
                                disabled={isJoining || cantAfford || !status.joinable}
                                onClick={() => handleJoinRoom(room.room_id, room.entry_cost)}
                                className={[
                                  'h-9 gap-1 rounded-full px-4 text-[13px] font-bold shadow-none disabled:bg-[#F5F6F7] disabled:text-[#9A9A9A]',
                                  status.joinable
                                    ? 'bg-[#FFD400] text-[#111] hover:bg-[#FFE040]'
                                    : 'bg-[#F1E8FF] text-[#7A37F0]',
                                ].join(' ')}
                              >
                                {isJoining ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <>
                                    {!status.joinable && <Play className="size-3" />}
                                    {status.joinLabel}
                                  </>
                                )}
                              </Button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-white/60 bg-white/85 p-6 shadow-[0_8px_24px_rgba(16,24,40,0.06)] backdrop-blur">
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

      <footer className="mt-10 border-t border-black/5 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-6 text-[13px] text-[#7B7B7B] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© Столото VIP · Быстрые бонусные игры на STL</p>
          <p>MVP · Хакатон Кубок России по продуктовому программированию</p>
        </div>
      </footer>
    </main>
  )
}

function pluralRooms(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'комната'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'комнаты'
  return 'комнат'
}
