import { LogOut } from 'lucide-react'

import { useBodyScrollLock } from '@shared/lib'
import { Button, Card } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import { useJoinGame } from '../lib'
import { type JoinGamePageProps } from '../model'
import { LobbyFilters } from './lobby-filters'
import { LobbyTable } from './lobby-table'

export function JoinGamePage({ onBackToGames, onCreateGame, onOpenLobby, onLogout, onUserBalanceChange, user }: JoinGamePageProps) {
  useBodyScrollLock()

  const {
    searchTerm,
    setSearchTerm,
    cyclePriceFilter,
    priceFilterLabel,
    cycleSeatsFilter,
    seatsFilterLabel,
    cycleSortBy,
    sortByLabel,
    onlyAffordable,
    setOnlyAffordable,
    matchedLobbies,
    bestMatch,
    isLoading,
    isJoining,
    loadError,
    isAffordablePrefillBannerVisible,
    joinError,
    handlePickAffordable,
    hideAffordablePrefillBanner,
    handleJoinLobby,
  } = useJoinGame({ userId: user.id, userName: user.name, userBalance: user.balance, onUserBalanceChange })

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-[#ACE35F] text-[#F6F7FA]">
      <AppHeader onBrandClick={onBackToGames} onCreateGame={onCreateGame} onLogout={onLogout} user={user} />

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
          <LobbyFilters
            bestMatch={bestMatch}
            onCyclePrice={cyclePriceFilter}
            onCycleSeats={cycleSeatsFilter}
            onCycleSort={cycleSortBy}
            onSearchChange={setSearchTerm}
            onToggleAffordable={() => setOnlyAffordable((v) => !v)}
            onlyAffordable={onlyAffordable}
            priceFilterLabel={priceFilterLabel}
            searchTerm={searchTerm}
            seatsFilterLabel={seatsFilterLabel}
            sortByLabel={sortByLabel}
          />

          <Card className="mt-4 rounded-[20px] border border-[#282B35] bg-[#1A1B21] p-3.5 shadow-[0_16px_30px_rgba(10,10,12,0.38)] sm:p-5">
            <div className="mb-3">
              <h1 className="m-0 text-[42px] leading-[0.92] font-bold text-[#ADE562] sm:text-[50px] lg:text-[56px]">Готовые лобби</h1>
              <p className="mt-1.5 text-[14px] leading-tight font-medium text-[#A1A7B5] sm:text-[15px] md:text-[16px]">
                Зайди в лобби к другим игрокам и вы вместе начнете игру
              </p>
              {isAffordablePrefillBannerVisible ? (
                <div className="mt-2 flex items-start justify-between gap-2 rounded-[10px] border border-[#3A5E40] bg-[#1E3324] px-3 py-2 text-[13px] text-[#CDE7D2]">
                  <p>Показываем только доступные комнаты и сортируем от дешёвых к дорогим.</p>
                  <button
                    className="shrink-0 rounded-[6px] border border-[#4D7654] bg-[#28442F] px-2 py-1 text-[12px] font-semibold text-white hover:bg-[#2F5038]"
                    onClick={hideAffordablePrefillBanner}
                    type="button"
                  >
                    Ок
                  </button>
                </div>
              ) : null}
              {isLoading ? <p className="mt-2 text-[13px] text-[#C8CDD8]">Загружаем комнаты из API...</p> : null}
              {loadError ? <p className="mt-2 text-[13px] text-[#FFD3D3]">{loadError}</p> : null}
            </div>

            <LobbyTable
              isJoining={isJoining}
              joinError={joinError}
              lobbies={matchedLobbies}
              onJoin={(id) => handleJoinLobby(id, (roomId) => onOpenLobby(roomId))}
              onPickAffordable={handlePickAffordable}
            />
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
