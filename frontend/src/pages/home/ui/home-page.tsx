import { LogOut, Newspaper } from 'lucide-react'

import { useBodyScrollLock } from '@shared/lib'
import { Button } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import { type HomePageProps } from '../model'
import { useQuickGame } from '../lib'
import { LastGamesSection } from './last-games-section'
import { NewsSlider } from './news-slider'

export function HomePage({ onBrandClick, onCreateGame, onJoinGame, onJoinLobby, user, onLogout }: HomePageProps) {
  useBodyScrollLock()

  const { handleQuickGame, isLoading: isQuickGameLoading, error: quickGameError } = useQuickGame({
    userId: user.id,
    userName: user.name,
    userBalance: user.balance,
    onJoinLobby,
  })

  return (
    <main className="fixed inset-0 overflow-hidden overscroll-none bg-[#0F1014] text-[#F2F3F5]">
      <section className="flex h-full w-full flex-col overflow-hidden border border-[#2A2B31] bg-[#15161C]">
        <AppHeader onBrandClick={onBrandClick} onCreateGame={onCreateGame} onLogout={onLogout} user={user} />

        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden px-4 py-5 lg:grid-cols-[420px_1fr] lg:px-8 lg:py-6">
          {/* Sidebar with action buttons */}
          <aside className="relative min-h-[360px] overflow-hidden rounded-[10px] border border-[#2B2C30] bg-[#14151A] sm:min-h-[430px] lg:h-full lg:min-h-0">
            <img
              alt="Игровой холодильник"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-90"
              src="/dev-assets/images/fridge_with_blocks.svg"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#111217]/40" />
            <div className="absolute inset-0 z-10 flex items-center justify-center px-4 sm:px-5">
              <div className="w-full max-w-[360px] space-y-3 sm:max-w-[380px]">
                <div className="space-y-1">
                  <Button
                    className="h-12 w-full rounded-[9px] bg-[#6B22F5] text-[clamp(1.1rem,2.25vw,2rem)] font-semibold text-white hover:bg-[#7A36F7] disabled:opacity-60 sm:h-14 lg:h-16"
                    disabled={isQuickGameLoading}
                    onClick={handleQuickGame}
                    type="button"
                  >
                    {isQuickGameLoading ? 'Поиск...' : 'Быстрая игра'}
                  </Button>
                  {quickGameError && (
                    <p className="text-center text-sm text-red-400">{quickGameError}</p>
                  )}
                </div>
                <Button
                  className="h-12 w-full rounded-[9px] bg-[#FF1493] text-[clamp(1.1rem,2.25vw,2rem)] font-semibold text-white hover:bg-[#FF2CA0] sm:h-14 lg:h-16"
                  onClick={onCreateGame}
                  type="button"
                >
                  Создать игру
                </Button>
                <Button
                  className="h-12 w-full rounded-[9px] bg-[#A8E45E] text-[clamp(1.1rem,2.15vw,1.85rem)] font-semibold text-[#101114] hover:bg-[#B9ED76] sm:h-14 lg:h-16"
                  onClick={onJoinGame}
                  type="button"
                >
                  Присоединиться к игре
                </Button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <section className="min-h-0 min-w-0 overflow-hidden">
            <h2 className="inline-flex items-center gap-2 text-[2rem] font-semibold text-[#A8E45E]">
              <Newspaper className="size-6" />
              Новости
            </h2>

            <NewsSlider />
            <LastGamesSection />
          </section>
        </div>

        <footer className="shrink-0 border-t border-[#2A2B31] bg-[#121319]">
          <div className="flex flex-col gap-3 px-4 py-4 text-[1.05rem] text-[#DFE1E6] sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <p>© All rights reserved.</p>
            <p>Powered by Skyeng</p>
          </div>
        </footer>
      </section>

      <Button className="sr-only" onClick={onLogout} type="button" variant="ghost">
        <LogOut className="size-4" />
        Выйти
      </Button>
    </main>
  )
}
