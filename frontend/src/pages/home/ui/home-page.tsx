import { ArrowRight, ChevronLeft, ChevronRight, Clock, Refrigerator, Sparkles } from 'lucide-react'

import { Button } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import { type HomePageProps } from '../model'
import { useQuickGame } from '../lib'
import { LastGamesSection } from './last-games-section'

type GameTile = {
  id: string
  name: string
  jackpot: string
  entry: string
  bg: string
  text: string
  badge: string
  badgeBg: string
  Icon: typeof Refrigerator
}

const GAME_TILES: GameTile[] = [
  {
    id: 'fridge',
    name: 'Ночной жор',
    jackpot: '208 002 258 ₽',
    entry: 'от 200 ₽',
    bg: 'bg-[#FFD400]',
    text: 'text-[#111]',
    badge: '02:14',
    badgeBg: 'bg-[#111] text-white',
    Icon: Refrigerator,
  },
  {
    id: 'fridge-pro',
    name: 'Жор PRO',
    jackpot: '100 000 000 ₽',
    entry: 'от 75 ₽',
    bg: 'bg-[#1AB75A]',
    text: 'text-white',
    badge: '00:14',
    badgeBg: 'bg-white text-[#111]',
    Icon: Sparkles,
  },
  {
    id: 'fridge-mini',
    name: 'Жор мини',
    jackpot: '5 408 882 ₽',
    entry: 'от 40 ₽',
    bg: 'bg-[#E5008C]',
    text: 'text-white',
    badge: '01:08',
    badgeBg: 'bg-white text-[#111]',
    Icon: Sparkles,
  },
  {
    id: 'fridge-blitz',
    name: 'Жор-блиц',
    jackpot: '30 000 000 ₽',
    entry: 'от 100 ₽',
    bg: 'bg-[#1666EC]',
    text: 'text-white',
    badge: '03:42',
    badgeBg: 'bg-white text-[#111]',
    Icon: Clock,
  },
  {
    id: 'fridge-night',
    name: 'Тёмный жор',
    jackpot: '85 296 619 ₽',
    entry: 'от 20 ₽',
    bg: 'bg-[#111]',
    text: 'text-white',
    badge: 'NEW',
    badgeBg: 'bg-[#FFD400] text-[#111]',
    Icon: Refrigerator,
  },
]

const PROMO_CARDS = [
  {
    id: 'p1',
    title: '300 000 ₽ на путешествие',
    subtitle: 'Выиграйте для всей семьи!',
    bg: 'bg-gradient-to-br from-[#E73B3B] to-[#A91313]',
  },
  {
    id: 'p2',
    title: 'Призы до 150 000 ₽',
    subtitle: 'Регистрируйте билеты и выигрывайте',
    bg: 'bg-gradient-to-br from-[#FFB300] to-[#FF7A00]',
  },
  {
    id: 'p3',
    title: 'Увеличили суперприз',
    subtitle: 'Заберите от 30 000 000 ₽',
    bg: 'bg-gradient-to-br from-[#7A2BD8] to-[#3F139C]',
  },
  {
    id: 'p4',
    title: 'Выигрыши от 100 ₽',
    subtitle: 'Забирайте больше!',
    bg: 'bg-gradient-to-br from-[#86C600] to-[#4A8E00]',
  },
] as const

export function HomePage({ onBrandClick, onJoinGame, onJoinLobby, user, onLogout }: HomePageProps) {
  const { handleQuickGame, isLoading: isQuickGameLoading, error: quickGameError } = useQuickGame({
    userId: user.id,
    userName: user.name,
    userBalance: user.balance,
    onJoinLobby,
  })

  return (
    <main className="min-h-svh bg-[#F7F8FA] text-[#111]">
      {/* Top winners strip */}
      <div className="border-b border-[#ECECEC] bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center gap-4 overflow-x-auto px-4 py-2 text-[13px] sm:px-6 lg:px-8">
          <span className="shrink-0 text-[#7B7B7B]">Разыграно сегодня:</span>
          {[
            ['460 860 ₽', '#111'],
            ['453 230 ₽', '#111'],
            ['409 240 ₽', '#111'],
            ['100 000 ₽', '#111'],
            ['1 251 750 ₽', '#111'],
          ].map(([amount, color]) => (
            <span key={amount} className="inline-flex shrink-0 items-center gap-1 font-semibold" style={{ color }}>
              <span className="grid size-5 place-items-center rounded-full bg-[#111] text-[10px] font-black text-[#FFD400]">
                ₽
              </span>
              {amount}
            </span>
          ))}
        </div>
      </div>

      <AppHeader onBrandClick={onBrandClick} onLogout={onLogout} user={user} />

      <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Hero banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF3B3B] to-[#A60E0E] px-6 py-10 text-white shadow-[0_18px_48px_rgba(166,14,14,0.25)] sm:px-12 sm:py-14">
          <div className="relative z-10 max-w-[640px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold uppercase tracking-wider backdrop-blur">
              <Sparkles className="size-3.5" />
              Повышенный джекпот
            </div>
            <h1 className="mt-4 text-[clamp(2rem,5vw,3.6rem)] font-black leading-[1.05]">
              ОТ 900 000 000 ₽
            </h1>
            <p className="mt-3 text-[clamp(1rem,1.4vw,1.15rem)] font-medium text-white/90">
              10 000 000 ₽ на загородный дом и другие призы
            </p>
            <Button
              className="mt-6 h-12 gap-2 rounded-full bg-[#FFD400] px-6 text-[16px] font-bold text-[#111] shadow-[0_8px_24px_rgba(255,212,0,0.45)] hover:bg-[#FFE040]"
              onClick={onJoinGame}
              type="button"
            >
              Играть сейчас
              <ArrowRight className="size-5" />
            </Button>
          </div>
          {/* Decorative orbs */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-[-4rem] right-20 h-56 w-56 rounded-full bg-[#FFD400]/30 blur-2xl" />
        </section>

        {/* Game tiles strip */}
        <section className="mt-6 rounded-3xl border border-[#ECECEC] bg-white p-3 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
          <div className="flex items-center gap-3 px-2 py-2">
            <button
              type="button"
              className="rounded-full bg-[#111] px-4 py-2 text-[13px] font-semibold text-white"
            >
              Ближайшие тиражи
            </button>
            <button type="button" className="px-3 py-2 text-[13px] font-semibold text-[#7B7B7B] hover:text-[#111]">
              Высокий суперприз
            </button>
            <button type="button" className="px-3 py-2 text-[13px] font-semibold text-[#7B7B7B] hover:text-[#111]">
              Сначала дешевле
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                className="h-9 w-9 rounded-full border-[#ECECEC] bg-white p-0 shadow-none hover:bg-[#F5F6F7]"
                type="button"
                variant="outline"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                className="h-9 w-9 rounded-full border-[#ECECEC] bg-white p-0 shadow-none hover:bg-[#F5F6F7]"
                type="button"
                variant="outline"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-2 sm:grid-cols-3 lg:grid-cols-5">
            {GAME_TILES.map(({ id, name, jackpot, entry, bg, text, badge, badgeBg, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={onJoinGame}
                className={`group relative flex h-[170px] flex-col justify-between overflow-hidden rounded-2xl ${bg} ${text} px-4 py-4 text-left transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(16,24,40,0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]`}
              >
                <div className="flex items-start justify-between">
                  <Icon className="size-7 opacity-90" />
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${badgeBg}`}>{badge}</span>
                </div>
                <div>
                  <p className="text-[12px] font-medium opacity-85">Суперприз</p>
                  <p className="mt-0.5 text-[16px] font-black leading-tight">{jackpot}</p>
                  <div className="mt-2 flex items-center justify-between text-[12px] font-semibold">
                    <span>{name}</span>
                    <span className="rounded-full bg-black/15 px-2 py-0.5">{entry}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Promo cards */}
        <section className="mt-8">
          <h2 className="text-[24px] font-black text-[#111]">Акции</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {PROMO_CARDS.map((promo) => (
              <button
                key={promo.id}
                type="button"
                onClick={onJoinGame}
                className={`relative flex h-[200px] flex-col justify-between overflow-hidden rounded-2xl ${promo.bg} px-5 py-5 text-left text-white shadow-[0_8px_24px_rgba(16,24,40,0.12)] transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(16,24,40,0.18)]`}
              >
                <p className="text-[18px] font-black leading-tight">{promo.title}</p>
                <div>
                  <p className="text-[13px] font-medium opacity-90">{promo.subtitle}</p>
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold backdrop-blur">
                    Участвовать
                    <ArrowRight className="size-3.5" />
                  </span>
                </div>
                <div className="pointer-events-none absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/15 blur-xl" />
              </button>
            ))}
          </div>
        </section>

        {/* Quick game CTA + last games */}
        <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-[#ECECEC] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
            <LastGamesSection />
          </div>
          <aside className="rounded-3xl border border-[#ECECEC] bg-gradient-to-br from-[#111] to-[#2A2A2A] p-6 text-white shadow-[0_2px_12px_rgba(16,24,40,0.08)]">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-[#FFD400]">Быстрая игра</p>
            <h3 className="mt-2 text-[24px] font-black leading-tight">
              Подберём комнату <br /> за пару секунд
            </h3>
            <p className="mt-3 text-[13px] text-white/70">
              Мы сами найдём свободную комнату с подходящим взносом.
            </p>
            <Button
              className="mt-5 h-12 w-full gap-2 rounded-full bg-[#FFD400] text-[16px] font-bold text-[#111] shadow-[0_8px_20px_rgba(255,212,0,0.35)] hover:bg-[#FFE040] disabled:opacity-60"
              disabled={isQuickGameLoading}
              onClick={handleQuickGame}
              type="button"
            >
              {isQuickGameLoading ? 'Ищем комнату...' : 'Найти комнату'}
              <ArrowRight className="size-5" />
            </Button>
            {quickGameError && <p className="mt-3 text-center text-[13px] text-[#FF6B6B]">{quickGameError}</p>}
          </aside>
        </section>
      </div>

      <footer className="mt-10 border-t border-[#ECECEC] bg-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-4 py-6 text-[13px] text-[#7B7B7B] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© Ночной жор. Все права защищены.</p>
          <p>Powered by Skyeng</p>
        </div>
      </footer>
    </main>
  )
}
