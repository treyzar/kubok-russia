import { Bell, ChevronDown, CircleDollarSign, LogOut, Plus, Search, Send } from 'lucide-react'
import { useEffect, useState } from 'react'

import { type AuthUser } from '@entities/user'
import { Avatar, AvatarFallback, AvatarImage, Button, Card, Input } from '@shared/ui'

type CreateGamePageProps = {
  user: AuthUser
  onBackToGames: () => void
  onJoinGame: () => void
  onOpenLobby: () => void
  onLogout: () => void
}

type GameBackground = 'altai' | 'space' | 'japan'

export function CreateGamePage({ onBackToGames, onJoinGame, onOpenLobby, onLogout, user }: CreateGamePageProps) {
  const [playersCount, setPlayersCount] = useState('10')
  const [startPrice, setStartPrice] = useState('3000')
  const [background, setBackground] = useState<GameBackground>('altai')
  const [showTutorial, setShowTutorial] = useState(false)

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
    <main className="fixed inset-0 overflow-hidden bg-[#FF1493] text-[#F2F3F5]">
      <section className="flex h-full w-full flex-col overflow-hidden">
        <header className="border-b border-[#2A2B31] bg-[#1D1E23]">
          <div className="mx-auto grid w-full max-w-[1248px] grid-cols-1 items-center gap-3 px-3 py-3 sm:px-4 md:grid-cols-[1fr_auto_1fr] md:px-5 xl:px-0">
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
                className="h-[46px] gap-2 rounded-[8px] border border-[#F21795] bg-[#3B2254] px-3 text-[14px] font-semibold text-[#F0EAFB] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#4D2C6E] hover:text-[#F0EAFB] hover:shadow-[0_12px_24px_rgba(52,24,78,0.50)] active:translate-y-0 active:scale-[0.98] md:h-[52px] md:px-4 md:text-[16px]"
                type="button"
                variant="outline"
              >
                <CircleDollarSign className="size-4 text-[#7D3EFF]" />
                12 000.00
                <ChevronDown className="size-4" />
              </Button>
              <Button
                className="h-[46px] w-[46px] rounded-[8px] border border-[#FF1894] bg-[#FF1894] p-0 text-white transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#FF2BA1] hover:shadow-[0_12px_24px_rgba(255,24,148,0.45)] active:translate-y-0 active:scale-[0.98] md:h-[52px] md:w-[52px]"
                type="button"
              >
                <Plus className="size-6 md:size-7" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 md:justify-end">
              <Button
                className="h-[46px] gap-2 rounded-[8px] border border-[#7620F5] bg-[#2A1F44] px-2.5 text-[14px] text-[#F0ECFB] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#322453] hover:text-[#F0ECFB] hover:shadow-[0_12px_24px_rgba(63,31,109,0.46)] active:translate-y-0 active:scale-[0.98] md:h-[52px] md:px-3.5 md:text-[16px]"
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
                className="h-[46px] w-[46px] rounded-[8px] border border-[#3A3B42] bg-[#1C1D24] p-0 text-[#ECEEF4] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#252731] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.48)] active:translate-y-0 active:scale-[0.98] md:h-[52px] md:w-[52px]"
                type="button"
                variant="outline"
              >
                <Send className="size-5" />
              </Button>
              <Button
                className="h-[46px] w-[46px] rounded-[8px] border border-[#3A3B42] bg-[#1C1D24] p-0 text-[#ECEEF4] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#252731] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.48)] active:translate-y-0 active:scale-[0.98] md:h-[52px] md:w-[52px]"
                type="button"
                variant="outline"
              >
                <Bell className="size-5" />
              </Button>
            </div>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-[1248px] flex-1 grid-cols-1 gap-4 overflow-y-auto px-3 pb-5 pt-4 sm:px-4 lg:grid-cols-[minmax(260px,418px)_1fr] lg:gap-6 lg:px-5 xl:px-0">
          <aside className="relative min-h-[340px] overflow-hidden rounded-[12px] border border-[#2D2E33] bg-[#1A1B21] sm:min-h-[420px] lg:min-h-0">
            <img alt="Игровой холодильник" className="h-full w-full object-cover" src="/dev-assets/images/logo-fridge.png" />
            <div className="absolute inset-x-[14px] top-[47%] flex -translate-y-1/2 flex-col gap-2.5">
              <Button
                className="h-[56px] rounded-[9px] border-0 bg-[#6B22F5] text-[16px] font-bold text-white transition-[transform,box-shadow,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#7A36F7] hover:shadow-[0_14px_28px_rgba(86,35,210,0.50)] active:translate-y-0 active:scale-[0.98] sm:h-[64px] sm:text-[18px]"
                onClick={onBackToGames}
                type="button"
              >
                БЫСТРАЯ ИГРА
              </Button>
              <Button
                className="h-[56px] rounded-[9px] border-0 bg-[#A8E45E] text-[16px] font-bold text-[#101114] transition-[transform,box-shadow,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#B9ED76] hover:text-[#101114] hover:shadow-[0_14px_28px_rgba(113,155,62,0.45)] active:translate-y-0 active:scale-[0.98] sm:h-[64px] sm:text-[18px]"
                onClick={onJoinGame}
                type="button"
              >
                ПРИСОЕДИНИТЬСЯ К ИГРЕ
              </Button>
            </div>
          </aside>

          <div className="min-w-0">
            <Card className="rounded-[20px] border border-[#432644] bg-[#3A2140] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.30)] sm:p-3.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_132px_132px] sm:gap-3">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#83889A]" />
                  <Input
                    className="h-[56px] rounded-[12px] border-[#333A45] bg-[#12141A] pl-11 text-[16px] text-[#F3F5F8] placeholder:text-[#949BB0] sm:h-[58px]"
                    placeholder="Поиск..."
                  />
                </div>
                <Button
                  className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#181B22] hover:text-[#EEF1F7] hover:shadow-[0_10px_22px_rgba(7,9,14,0.45)] active:translate-y-0 active:scale-[0.98] sm:h-[58px]"
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
                  className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#181B22] hover:text-[#EEF1F7] hover:shadow-[0_10px_22px_rgba(7,9,14,0.45)] active:translate-y-0 active:scale-[0.98] sm:h-[58px]"
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

            <Card className="mt-4 rounded-[20px] border border-[#2B2F3A] bg-[#191B22] p-3.5 shadow-[0_16px_30px_rgba(10,10,12,0.38)] sm:p-5 lg:p-6">
              <h1 className="m-0 text-[42px] leading-[0.92] font-bold text-[#ADE562] sm:text-[50px] lg:text-[56px]">Создать игру</h1>
              <p className="mt-1.5 text-[14px] leading-tight font-medium text-[#A1A7B5] sm:text-[15px] md:text-[16px]">Настройки игры</p>

              <div className="mt-4 h-px w-full bg-[#2F3442]" />

              <div className="mt-4 space-y-3.5">
                <div className="grid items-center gap-2 md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
                  <label className="text-[15px] font-medium text-[#ECEEF4] md:text-[18px]" htmlFor="players-count">
                    Число игроков
                  </label>
                  <Input
                    className="h-[46px] rounded-[12px] border-[#363B4A] bg-[#17181D] text-[16px] text-[#ECEEF4] focus-visible:border-[#555C6D]"
                    id="players-count"
                    onChange={(event) => setPlayersCount(event.target.value)}
                    value={playersCount}
                  />
                </div>

                <div className="grid items-center gap-2 md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
                  <label className="text-[15px] font-medium text-[#ECEEF4] md:text-[18px]" htmlFor="start-price">
                    Начальная стоимость
                  </label>
                  <Input
                    className="h-[46px] rounded-[12px] border-[#363B4A] bg-[#17181D] text-[16px] text-[#ECEEF4] focus-visible:border-[#555C6D]"
                    id="start-price"
                    onChange={(event) => setStartPrice(event.target.value)}
                    value={startPrice}
                  />
                </div>

                <div className="grid items-center gap-2 md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
                  <p className="text-[15px] font-medium text-[#ECEEF4] md:text-[18px]">Фон игры</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      className={`h-[46px] rounded-[12px] text-[16px] font-medium ${
                        background === 'altai'
                          ? 'bg-[#FF1493] text-white hover:bg-[#FF2BA1] hover:text-white hover:shadow-[0_12px_24px_rgba(255,20,147,0.45)]'
                          : 'border border-[#363B4A] bg-[#17181D] text-[#ECEEF4] hover:bg-[#1E2027] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.44)]'
                      }`}
                      onClick={() => setBackground('altai')}
                      type="button"
                    >
                      Алтай
                    </Button>
                    <Button
                      className={`h-[46px] rounded-[12px] text-[16px] font-medium ${
                        background === 'space'
                          ? 'bg-[#FF1493] text-white hover:bg-[#FF2BA1] hover:text-white hover:shadow-[0_12px_24px_rgba(255,20,147,0.45)]'
                          : 'border border-[#363B4A] bg-[#17181D] text-[#ECEEF4] hover:bg-[#1E2027] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.44)]'
                      }`}
                      onClick={() => setBackground('space')}
                      type="button"
                    >
                      Космос
                    </Button>
                    <Button
                      className={`h-[46px] rounded-[12px] text-[16px] font-medium ${
                        background === 'japan'
                          ? 'bg-[#FF1493] text-white hover:bg-[#FF2BA1] hover:text-white hover:shadow-[0_12px_24px_rgba(255,20,147,0.45)]'
                          : 'border border-[#363B4A] bg-[#17181D] text-[#ECEEF4] hover:bg-[#1E2027] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.44)]'
                      }`}
                      onClick={() => setBackground('japan')}
                      type="button"
                    >
                      Япония
                    </Button>
                  </div>
                </div>
              </div>

              <label className="mt-4 inline-flex items-center gap-2.5 text-[14px] font-medium text-[#A8AFBC] md:text-[16px]">
                <input
                  checked={showTutorial}
                  className="size-5 appearance-none rounded-[4px] border border-[#ABE362] bg-transparent checked:bg-[#ABE362]"
                  onChange={(event) => setShowTutorial(event.target.checked)}
                  type="checkbox"
                />
                Показывать обучение в начале игры
              </label>
            </Card>

            <div className="mt-4 flex justify-end">
              <Button
                className="h-[54px] min-w-[138px] rounded-[10px] bg-[#6B22F5] px-8 text-[38px] font-semibold text-white shadow-[0_10px_20px_rgba(68,44,229,0.38)] transition-[transform,box-shadow,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#7D38FF] hover:text-white hover:shadow-[0_16px_30px_rgba(86,58,240,0.50)] active:translate-y-0 active:scale-[0.98]"
                onClick={onOpenLobby}
                type="button"
              >
                Начать
              </Button>
            </div>
          </div>
        </section>
      </section>

      <Button className="sr-only" onClick={onLogout} type="button" variant="ghost">
        <LogOut className="size-4" />
        Выйти
      </Button>
    </main>
  )
}
