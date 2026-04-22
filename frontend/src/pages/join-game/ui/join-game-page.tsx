import { ChevronDown, LogOut, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useBodyScrollLock } from '@shared/lib'

import { Button, Card, Input } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import {
  LOBBIES,
  lobbyRowStyles,
  matchesPriceFilter,
  matchesSeatsFilter,
  parseLobbyCost,
  sortLobbies,
  tableGridClass,
  type JoinGamePageProps,
  type LobbyPriceFilter,
  type LobbySeatsFilter,
  type LobbySort,
} from '../model'

export function JoinGamePage({ onBackToGames, onCreateGame, onOpenLobby, onLogout, user }: JoinGamePageProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [priceFilter, setPriceFilter] = useState<LobbyPriceFilter>('any')
  const [seatsFilter, setSeatsFilter] = useState<LobbySeatsFilter>('any')
  const [sortBy, setSortBy] = useState<LobbySort>('recommended')
  const [onlyAffordable, setOnlyAffordable] = useState(false)
  const [joinError, setJoinError] = useState('')

  useBodyScrollLock()
  const matchedLobby = useMemo(() => {
    const filtered = LOBBIES.filter((lobby) => {
      const cost = parseLobbyCost(lobby.cost)
      const seats = Number(lobby.players.split('/')[0]?.trim() ?? 0)
      if (searchTerm.trim() && !lobby.creator.toLowerCase().includes(searchTerm.trim().toLowerCase()) && !`${lobby.id}`.includes(searchTerm.trim())) {
        return false
      }
      if (!matchesPriceFilter(cost, priceFilter)) {
        return false
      }
      if (!matchesSeatsFilter(seats, seatsFilter)) {
        return false
      }
      if (onlyAffordable && cost > user.balance) {
        return false
      }
      return true
    })

    return sortLobbies(filtered, sortBy)
  }, [onlyAffordable, priceFilter, searchTerm, seatsFilter, sortBy, user.balance])

  const bestMatch = matchedLobby[0] ?? null

  function handlePickAffordable(): void {
    setOnlyAffordable(true)
    setPriceFilter('cheap')
    setSortBy('price-asc')
    setJoinError('')
  }

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-[#ACE35F] text-[#F6F7FA]">
      <AppHeader onBrandClick={onBackToGames} onCreateGame={onCreateGame} user={user} />

      <section className="mx-auto grid w-full max-w-[1168px] flex-1 grid-cols-1 gap-4 overflow-y-auto px-3 pb-4 pt-4 sm:px-4 lg:grid-cols-[minmax(270px,438px)_1fr] lg:gap-7 lg:px-5 xl:px-0">
        <aside className="relative min-h-[340px] overflow-hidden rounded-[12px] border border-[#2D2E33] bg-[#1A1B21] sm:min-h-[420px] lg:min-h-0">
          <img alt="Игровой холодильник" className="h-full w-full object-cover" src="/dev-assets/images/logo-fridge.png" />
          <div className="absolute inset-x-[14px] top-[47%] flex -translate-y-1/2 flex-col gap-2.5">
            <Button
              className="h-[56px] rounded-[9px] border-0 bg-[#6B22F5] text-[16px] font-bold text-white hover:bg-[#7A36F7] sm:h-[64px] sm:text-[18px]"
              onClick={onBackToGames}
              type="button"
            >
              БЫСТРАЯ ИГРА
            </Button>
            <Button
              className="h-[56px] rounded-[9px] border-0 bg-[#FF1493] text-[16px] font-bold text-white hover:bg-[#FF2BA1] sm:h-[64px] sm:text-[18px]"
              onClick={onCreateGame}
              type="button"
            >
              СОЗДАТЬ ИГРУ
            </Button>
          </div>
        </aside>

        <div className="min-w-0">
          <Card className="rounded-[20px] border border-[#2F352F] bg-[#2A3325] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.30)] sm:p-3.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_132px_132px] sm:gap-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#83889A]" />
                <Input
                  className="h-[56px] rounded-[12px] border-[#333A45] bg-[#12141A] pl-11 text-[16px] text-[#F3F5F8] placeholder:text-[#949BB0] sm:h-[58px]"
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Поиск по ID/создателю..."
                  value={searchTerm}
                />
              </div>
              <Button
                className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] hover:bg-[#181B22] sm:h-[58px]"
                onClick={() => {
                  setPriceFilter((value) => (value === 'any' ? 'cheap' : value === 'cheap' ? 'medium' : value === 'medium' ? 'high' : 'any'))
                }}
                type="button"
                variant="outline"
              >
                <span>
                  {priceFilter === 'any' && 'Любая'}
                  {priceFilter === 'cheap' && 'До 1 000'}
                  {priceFilter === 'medium' && '1 001 — 15 000'}
                  {priceFilter === 'high' && 'Выше 15 000'}
                  <br />
                  начальная
                  <br />
                  стоимость
                </span>
                <ChevronDown className="size-4 shrink-0" />
              </Button>
              <Button
                className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] hover:bg-[#181B22] sm:h-[58px]"
                onClick={() => {
                  setSeatsFilter((value) => (value === 'any' ? 'small' : value === 'small' ? 'mid' : value === 'mid' ? 'large' : 'any'))
                }}
                type="button"
                variant="outline"
              >
                <span>
                  {seatsFilter === 'any' && 'Любое число'}
                  {seatsFilter === 'small' && 'До 3 игроков'}
                  {seatsFilter === 'mid' && '4-6 игроков'}
                  {seatsFilter === 'large' && 'От 7 игроков'}
                  <br />
                  игроков
                </span>
                <ChevronDown className="size-4 shrink-0" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                className="h-9 rounded-[10px] border border-[#333A45] bg-[#12141A] px-3 text-[13px] text-[#EEF1F7] hover:bg-[#181B22]"
                onClick={() => setSortBy((value) => (value === 'recommended' ? 'price-asc' : value === 'price-asc' ? 'price-desc' : value === 'price-desc' ? 'seats-asc' : 'recommended'))}
                type="button"
                variant="outline"
              >
                Сортировка: {sortBy === 'recommended' ? 'рекомендовано' : sortBy === 'price-asc' ? 'дешевле' : sortBy === 'price-desc' ? 'дороже' : 'по местам'}
              </Button>
              <Button
                className="h-9 rounded-[10px] border border-[#333A45] bg-[#12141A] px-3 text-[13px] text-[#EEF1F7] hover:bg-[#181B22]"
                onClick={() => setOnlyAffordable((value) => !value)}
                type="button"
                variant="outline"
              >
                {onlyAffordable ? 'Только доступные: да' : 'Только доступные: нет'}
              </Button>
            </div>
            {bestMatch ? (
              <p className="mt-2 rounded-lg border border-[#3A4550] bg-[#18202B] px-3 py-2 text-[13px] text-[#D2DCE8]">
                Подходящая комната: №{bestMatch.id} • вход {bestMatch.cost} • {bestMatch.players}
              </p>
            ) : (
              <p className="mt-2 rounded-lg border border-[#4E2D2D] bg-[#2C1B1B] px-3 py-2 text-[13px] text-[#FFD0D0]">
                По вашим параметрам нет комнат. Измените фильтры.
              </p>
            )}
          </Card>

          <Card className="mt-4 rounded-[20px] border border-[#282B35] bg-[#1A1B21] p-3.5 shadow-[0_16px_30px_rgba(10,10,12,0.38)] sm:p-5">
            <div className="mb-3">
              <h1 className="m-0 text-[42px] leading-[0.92] font-bold text-[#ADE562] sm:text-[50px] lg:text-[56px]">Готовые лобби</h1>
              <p className="mt-1.5 text-[14px] leading-tight font-medium text-[#A1A7B5] sm:text-[15px] md:text-[16px]">
                Зайди в лобби к другим игрокам и вы вместе начнете игру
              </p>
            </div>

            <div className={`${tableGridClass} border-b border-[#333742] px-2 pb-3 text-[12px] text-[#9EA3B2] sm:px-3 sm:pt-2 sm:text-[14px]`}>
              <span>Номер</span>
              <span>Создатель</span>
              <span className="text-center">Число игроков</span>
              <span className="text-right">Начальная стоимость</span>
            </div>

            <div className="mt-3 h-[clamp(260px,46vh,520px)] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#8A4BFF_#252A35] [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#252A35]/85 [&::-webkit-scrollbar-track]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[linear-gradient(180deg,#8A4BFF_0%,#FF249C_100%)] [&::-webkit-scrollbar-thumb]:shadow-[0_0_0_1px_rgba(255,255,255,0.20)] [&::-webkit-scrollbar-thumb:hover]:bg-[linear-gradient(180deg,#9E67FF_0%,#FF49AE_100%)]">
              <div className="flex flex-col gap-2.5">
                {matchedLobby.map((lobby) => (
                  <button
                    className={`${tableGridClass} items-center rounded-[14px] border px-3 py-2.5 text-[14px] text-[#F7F8FC] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-[1px] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8E45E] sm:px-4 sm:text-[15px] md:px-6 md:text-[16px] ${lobbyRowStyles[lobby.type]}`}
                    key={lobby.id}
                    onClick={() => {
                      const cost = parseLobbyCost(lobby.cost)
                      if (user.balance < cost) {
                        setJoinError(
                          `Недостаточно баллов для комнаты №${lobby.id}. Доступно: ${user.balance.toLocaleString('ru-RU')} ₽, требуется: ${cost.toLocaleString('ru-RU')} ₽.`,
                        )
                        return
                      }
                      setJoinError('')
                      onOpenLobby()
                    }}
                    type="button"
                  >
                    <span>{lobby.id}</span>
                    <span className="truncate font-semibold">{lobby.creator}</span>
                    <span className="text-center font-semibold">{lobby.players}</span>
                    <span className="text-right font-semibold">{lobby.cost}</span>
                  </button>
                ))}
              </div>
            </div>
            {joinError ? (
              <div className="mt-3 rounded-[12px] border border-[#AA4242] bg-[#3A2020] px-3 py-2.5 text-[14px] text-[#FFD3D3]">
                <p>{joinError}</p>
                <Button className="mt-2 h-8 rounded-[8px] bg-[#A8E45E] px-3 text-[#101114] hover:bg-[#B8ED75]" onClick={handlePickAffordable} type="button">
                  Подобрать дешевле
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </section>

      <Button className="sr-only" onClick={onLogout} type="button" variant="ghost">
        <LogOut className="size-4" />
        Выйти
      </Button>
    </main>
  )
}
