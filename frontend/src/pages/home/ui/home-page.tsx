import { Clock3, Filter, Flame, LogOut, Search, Sparkles, Ticket, UsersRound } from 'lucide-react'

import { type AuthUser } from '@/features/mock-auth/model/mock-auth'
import { Button } from '@/shared/ui/button'

type HomePageProps = {
  user: AuthUser
  onLogout: () => void
}

export function HomePage({ user, onLogout }: HomePageProps) {
  const roomFilters = ['Быстрый старт', '2 игрока', '4 игрока', 'С бустом', 'Высокий фонд']

  const roomDrafts = [
    { id: 'RM-201', title: 'Турбо-дуэль', entry: 300, players: '2/2', timer: '00:28', fund: 600 },
    { id: 'RM-184', title: 'VIP арена', entry: 1200, players: '3/4', timer: '01:42', fund: 3600 },
    { id: 'RM-176', title: 'Комната удачи', entry: 500, players: '1/4', timer: '02:11', fund: 500 },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FCFCFC] text-[#222222]">
      <div className="auth-aurora auth-aurora--one" />
      <div className="auth-aurora auth-aurora--two" />
      <div className="auth-aurora auth-aurora--three" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,209,0,0.22),transparent_30%),radial-gradient(circle_at_78%_84%,rgba(255,209,0,0.18),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(34,211,238,0.18),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,209,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,209,0,0.08)_1px,transparent_1px)] bg-[size:58px_58px] opacity-45" />
      <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_220deg_at_70%_35%,rgba(255,209,0,0.15),rgba(125,211,252,0.15),rgba(255,255,255,0.08),rgba(255,209,0,0.15))] mix-blend-multiply opacity-40" />
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full border border-[#FFD100]/30" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 h-80 w-80 rounded-full border border-[#FFD100]/25" />
      <div className="pointer-events-none absolute top-24 right-16 hidden h-12 w-44 rounded-full border border-[#FFD100]/35 lg:block" />
      <div className="pointer-events-none absolute top-1/2 left-10 hidden h-32 w-32 -translate-y-1/2 rounded-full border border-dashed border-[#FFD100]/35 lg:block" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <header className="rounded-3xl border border-[#E4E4E4] bg-[#F6F6F6]/95 p-5 shadow-[0_22px_60px_rgba(16,24,40,0.18)] backdrop-blur-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-sm text-[#777777]">
                <Sparkles size={14} />
                Главная страница MVP (набросок)
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#111111] sm:text-4xl">Комнаты и фильтры</h1>
              <p className="mt-2 text-sm text-[#6A6A6A]">
                Привет, {user.name}. Ниже черновая структура экрана, которую мы потом доработаем в полноценный
                production-flow.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button className="gap-2 rounded-xl border-[#D5D5D5] bg-white text-[#222222] hover:bg-[#F8F8F8]" variant="outline">
                <Search size={15} />
                Поиск
              </Button>
              <Button className="gap-2 rounded-xl border-[#D5D5D5] bg-white text-[#222222] hover:bg-[#F8F8F8]" onClick={onLogout} variant="outline">
                <LogOut size={15} />
                Выйти
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <article className="rounded-2xl border border-[#D8D8D8] bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-[#838383]">Профиль</p>
              <p className="mt-1 text-lg font-semibold text-[#111111]">{user.role}</p>
              <p className="text-sm text-[#5F5F5F]">@{user.username}</p>
            </article>
            <article className="rounded-2xl border border-[#D8D8D8] bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-[#838383]">Баланс</p>
              <p className="mt-1 text-lg font-semibold text-[#111111]">{user.balance.toLocaleString('ru-RU')} бонусов</p>
              <p className="text-sm text-[#5F5F5F]">Доступно для входа в комнаты</p>
            </article>
            <article className="rounded-2xl border border-[#D8D8D8] bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-[#838383]">Статус MVP</p>
              <p className="mt-1 text-lg font-semibold text-[#111111]">Черновой экран</p>
              <p className="text-sm text-[#5F5F5F]">Готов к дальнейшей детализации</p>
            </article>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-[#E4E4E4] bg-[#F6F6F6]/95 p-5 shadow-[0_22px_60px_rgba(16,24,40,0.18)] backdrop-blur-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-xl font-semibold text-[#111111]">
                <Filter size={18} />
                Фильтры комнат
              </h2>
              <Button className="rounded-xl bg-[#FFD100] text-[#111111] hover:bg-[#F2C400]" size="sm">
                Применить
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {roomFilters.map((filter, index) => (
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    index === 0
                      ? 'border-[#FFD100] bg-[#FFF7CC] text-[#1A1A1A]'
                      : 'border-[#D7D7D7] bg-white text-[#4D4D4D] hover:border-[#FFD100]'
                  }`}
                  key={filter}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {roomDrafts.map((room) => (
                <article className="rounded-2xl border border-[#D8D8D8] bg-white p-4 transition hover:border-[#FFD100]" key={room.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs tracking-wide text-[#868686] uppercase">{room.id}</p>
                      <h3 className="mt-1 text-lg font-semibold text-[#171717]">{room.title}</h3>
                    </div>
                    <Button className="rounded-xl bg-[#111111] text-white hover:bg-black" size="sm">
                      Войти
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#5F5F5F] sm:grid-cols-4">
                    <p className="inline-flex items-center gap-1.5">
                      <Ticket size={14} />
                      Вход: {room.entry}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <UsersRound size={14} />
                      Игроки: {room.players}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Clock3 size={14} />
                      Старт: {room.timer}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Flame size={14} />
                      Фонд: {room.fund}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-[#E4E4E4] bg-[#F6F6F6]/95 p-5 shadow-[0_22px_60px_rgba(16,24,40,0.18)] backdrop-blur-sm sm:p-6">
              <h3 className="text-lg font-semibold text-[#111111]">Быстрые действия</h3>
              <div className="mt-4 space-y-2">
                <button className="w-full rounded-xl border border-[#D5D5D5] bg-white px-3 py-2.5 text-left text-sm text-[#3F3F3F] transition hover:border-[#FFD100]" type="button">
                  Создать комнату
                </button>
                <button className="w-full rounded-xl border border-[#D5D5D5] bg-white px-3 py-2.5 text-left text-sm text-[#3F3F3F] transition hover:border-[#FFD100]" type="button">
                  История раундов
                </button>
                <button className="w-full rounded-xl border border-[#D5D5D5] bg-white px-3 py-2.5 text-left text-sm text-[#3F3F3F] transition hover:border-[#FFD100]" type="button">
                  Таблица победителей
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-[#E4E4E4] bg-[#F6F6F6]/95 p-5 shadow-[0_22px_60px_rgba(16,24,40,0.18)] backdrop-blur-sm sm:p-6">
              <h3 className="text-lg font-semibold text-[#111111]">Примечание по доработке</h3>
              <p className="mt-3 text-sm text-[#606060]">
                Это намеренно упрощённый каркас главной. Следующим этапом сюда добавим рабочие фильтры, пагинацию
                комнат, статусы real-time и историю ставок.
              </p>
            </section>
          </aside>
        </section>
      </section>
    </main>
  )
}
