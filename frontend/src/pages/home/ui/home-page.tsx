import { Newspaper, Refrigerator } from 'lucide-react'

import { useBodyScrollLock } from '@shared/lib'
import { Button } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import { type HomePageProps } from '../model'
import { useQuickGame } from '../lib'
import { LastGamesSection } from './last-games-section'
import { NewsSlider } from './news-slider'

type AvailableGame = {
  id: string
  title: string
  description: string
  Icon: typeof Refrigerator
}

const AVAILABLE_GAMES: AvailableGame[] = [
  {
    id: 'fridge',
    title: 'Ночной жор',
    description: 'Соберите блоки в холодильнике и сорвите джекпот',
    Icon: Refrigerator,
  },
]

export function HomePage({ onBrandClick, onJoinGame, onJoinLobby, user, onLogout }: HomePageProps) {
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
        <AppHeader onBrandClick={onBrandClick} onLogout={onLogout} user={user} />

        <div className="grid min-h-0 flex-1 gap-5 overflow-hidden px-4 py-5 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-6">
          {/* Main content: news + last games */}
          <section className="min-h-0 min-w-0 overflow-hidden">
            <h2 className="inline-flex items-center gap-2 text-[2rem] font-semibold text-[#A8E45E]">
              <Newspaper className="size-6" />
              Новости
            </h2>

            <NewsSlider />
            <LastGamesSection />
          </section>

          {/* Right sidebar — list of available games */}
          <aside className="min-h-0 overflow-y-auto rounded-[10px] border border-[#2B2C30] bg-[#181920] p-5">
            <header className="mb-5">
              <h2 className="text-[1.4rem] font-semibold text-[#F2F3F5]">Игры</h2>
              <p className="mt-1 text-[0.85rem] text-[#9098A8]">Выберите игру, чтобы перейти к комнатам.</p>
            </header>

            <div className="space-y-3">
              {AVAILABLE_GAMES.map(({ id, title, description, Icon }) => (
                <button
                  key={id}
                  onClick={onJoinGame}
                  type="button"
                  className="group flex w-full items-center gap-4 rounded-[10px] border border-[#2D2E36] bg-[#1F2029] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[#A8E45E] hover:bg-[#23252F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8E45E]"
                >
                  <span className="grid size-12 place-items-center rounded-[10px] bg-[#2D3F1B] text-[#A8E45E] transition group-hover:bg-[#3A521F]">
                    <Icon className="size-7" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[1.05rem] font-semibold text-[#F2F3F5]">{title}</span>
                    <span className="mt-0.5 block text-[0.82rem] leading-snug text-[#9098A8]">{description}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-2 border-t border-[#2A2B31] pt-5">
              <Button
                className="h-12 w-full rounded-[9px] bg-[#6B22F5] text-base font-semibold text-white hover:bg-[#7A36F7] disabled:opacity-60"
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
          </aside>
        </div>

        <footer className="shrink-0 border-t border-[#2A2B31] bg-[#121319]">
          <div className="flex flex-col gap-3 px-4 py-4 text-[1.05rem] text-[#DFE1E6] sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <p>© All rights reserved.</p>
            <p>Powered by Skyeng</p>
          </div>
        </footer>
      </section>
    </main>
  )
}
