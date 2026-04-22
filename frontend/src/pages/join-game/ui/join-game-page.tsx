import { Bell, ChevronDown, CircleDollarSign, LogOut, Plus, Search, Send } from 'lucide-react'
import { useEffect } from 'react'

import { type AuthUser } from '@entities/user'
import { Avatar, AvatarFallback, AvatarImage, Button, Card, Input } from '@shared/ui'

type JoinGamePageProps = {
  user: AuthUser
  onBackToGames: () => void
  onCreateGame: () => void
  onOpenLobby: () => void
  onLogout: () => void
}

type Lobby = {
  id: number
  creator: string
  players: string
  cost: string
  type: 'purple' | 'pink' | 'green'
}

const LOBBIES: Lobby[] = [
  { id: 634101, creator: 'Андропов Михаил', players: '4 / 10', cost: '200', type: 'purple' },
  { id: 634102, creator: 'Александр Лисаев', players: '6 / 10', cost: '20 000', type: 'pink' },
  { id: 634103, creator: 'Дмитрий Чепутинов', players: '8 / 10', cost: '200 000', type: 'green' },
  { id: 634104, creator: 'Игорь Нефедов', players: '3 / 10', cost: '500', type: 'purple' },
  { id: 634105, creator: 'Роман Калягин', players: '5 / 10', cost: '3 000', type: 'pink' },
  { id: 634106, creator: 'Кирилл Зотов', players: '2 / 10', cost: '1 200', type: 'purple' },
  { id: 634107, creator: 'Артур Шубин', players: '7 / 10', cost: '40 000', type: 'pink' },
  { id: 634108, creator: 'Виктор Никитин', players: '9 / 10', cost: '90 000', type: 'green' },
  { id: 634109, creator: 'Глеб Савельев', players: '1 / 10', cost: '100', type: 'purple' },
  { id: 634110, creator: 'Тимур Ахмедов', players: '4 / 10', cost: '700', type: 'purple' },
  { id: 634111, creator: 'Максим Данилов', players: '6 / 10', cost: '12 000', type: 'pink' },
  { id: 634112, creator: 'Станислав Рощин', players: '8 / 10', cost: '160 000', type: 'green' },
  { id: 634113, creator: 'Павел Чередников', players: '3 / 10', cost: '1 000', type: 'purple' },
  { id: 634114, creator: 'Евгений Чернов', players: '5 / 10', cost: '8 000', type: 'pink' },
]

const lobbyRowStyles: Record<Lobby['type'], string> = {
  purple: 'border-[#792DF6] bg-[rgba(55,31,86,0.88)]',
  pink: 'border-[#FF1493] bg-[rgba(81,28,62,0.88)]',
  green: 'border-[#ADE562] bg-[rgba(68,84,48,0.88)]',
}

const tableGridClass =
  'grid grid-cols-[66px_minmax(130px,1.35fr)_minmax(86px,1fr)_minmax(102px,1fr)] md:grid-cols-[86px_minmax(180px,1.35fr)_minmax(122px,1fr)_minmax(140px,1fr)]'

export function JoinGamePage({ onBackToGames, onCreateGame, onOpenLobby, onLogout, user }: JoinGamePageProps) {
  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  return (
    <main className="flex min-h-dvh flex-col overflow-hidden bg-[#ACE35F] text-[#F6F7FA]">
      <header className="border-b border-[#2A2B31] bg-[#1D1E23]">
        <div className="mx-auto grid w-full max-w-[1168px] grid-cols-1 items-center gap-3 px-3 py-3 sm:px-4 md:grid-cols-[1fr_auto_1fr] md:px-5 xl:px-0">
          <button
            className="inline-flex items-center justify-center gap-3 border-0 bg-transparent text-[#F5F6F9] md:justify-start"
            onClick={onBackToGames}
            type="button"
          >
            <img alt="Ночной жор" className="h-[44px] w-[44px] rounded-full object-cover md:h-[46px] md:w-[46px]" src="/dev-assets/images/logo.svg" />
            <span className="text-[32px] leading-none font-bold tracking-[0.02em] sm:text-[36px] lg:text-[39px]">НОЧНОЙ ЖОР</span>
          </button>

          <div className="flex items-center justify-center gap-2">
            <Button
              className="h-[46px] gap-2 rounded-[8px] border border-[#F21795] bg-[#3B2254] px-3 text-[14px] font-semibold text-[#F0EAFB] hover:bg-[#4D2C6E] md:h-[52px] md:px-4 md:text-[16px]"
              type="button"
              variant="outline"
            >
              <CircleDollarSign className="size-4 text-[#7D3EFF]" />
              12 000.00
              <ChevronDown className="size-4" />
            </Button>
            <Button
              className="h-[46px] w-[46px] rounded-[8px] border border-[#FF1894] bg-[#FF1894] p-0 text-white hover:bg-[#FF2BA1] md:h-[52px] md:w-[52px]"
              onClick={onCreateGame}
              type="button"
            >
              <Plus className="size-6 md:size-7" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 md:justify-end">
            <Button
              className="h-[46px] gap-2 rounded-[8px] border border-[#7620F5] bg-[#2A1F44] px-2.5 text-[14px] text-[#F0ECFB] hover:bg-[#322453] md:h-[52px] md:px-3.5 md:text-[16px]"
              type="button"
              variant="outline"
            >
              <Avatar className="size-7">
                <AvatarImage alt={user.name} src="/dev-assets/images/card_with_peoples.svg" />
                <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <span className="max-w-[130px] truncate font-semibold md:max-w-[170px]">{user.name}</span>
              <ChevronDown className="size-4" />
            </Button>
            <Button
              className="h-[46px] w-[46px] rounded-[8px] border border-[#3A3B42] bg-[#1C1D24] p-0 text-[#ECEEF4] hover:bg-[#252731] md:h-[52px] md:w-[52px]"
              type="button"
              variant="outline"
            >
              <Send className="size-5" />
            </Button>
            <Button
              className="h-[46px] w-[46px] rounded-[8px] border border-[#3A3B42] bg-[#1C1D24] p-0 text-[#ECEEF4] hover:bg-[#252731] md:h-[52px] md:w-[52px]"
              type="button"
              variant="outline"
            >
              <Bell className="size-5" />
            </Button>
          </div>
        </div>
      </header>

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
                  placeholder="Поиск..."
                />
              </div>
              <Button
                className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] hover:bg-[#181B22] sm:h-[58px]"
                type="button"
                variant="outline"
              >
                <span>
                  Любая
                  <br />
                  начальная
                  <br />
                  стоимость
                </span>
                <ChevronDown className="size-4 shrink-0" />
              </Button>
              <Button
                className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] hover:bg-[#181B22] sm:h-[58px]"
                type="button"
                variant="outline"
              >
                <span>
                  Любое число
                  <br />
                  игроков
                </span>
                <ChevronDown className="size-4 shrink-0" />
              </Button>
            </div>
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
                {LOBBIES.map((lobby) => (
                  <button
                    className={`${tableGridClass} items-center rounded-[14px] border px-3 py-2.5 text-[14px] text-[#F7F8FC] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-[1px] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8E45E] sm:px-4 sm:text-[15px] md:px-6 md:text-[16px] ${lobbyRowStyles[lobby.type]}`}
                    key={lobby.id}
                    onClick={onOpenLobby}
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
