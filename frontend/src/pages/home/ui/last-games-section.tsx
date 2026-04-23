import { ArrowRight, Trophy } from 'lucide-react'
import { useLastGames } from '../lib/use-last-games'

export function LastGamesSection() {
  const { rounds, isLoading, isError } = useLastGames()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-[20px] font-black text-[#111]">
          <Trophy className="size-5 text-[#FFC400]" />
          Последние игры
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#7B7B7B] hover:text-[#111]"
        >
          Все игры
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {isLoading && <p className="col-span-full text-[#7B7B7B]">Загрузка...</p>}
        {isError && <p className="col-span-full text-[#E73B3B]">Не удалось загрузить последние игры</p>}
        {!isLoading && !isError && rounds.length === 0 && (
          <p className="col-span-full text-[#7B7B7B]">Игр пока нет</p>
        )}
        {!isLoading &&
          !isError &&
          rounds.slice(0, 6).map((round) => (
            <article
              key={round.room_id}
              className="overflow-hidden rounded-2xl border border-[#ECECEC] bg-[#FAFBFC] p-4 transition hover:-translate-y-0.5 hover:border-[#FFD400] hover:shadow-[0_8px_24px_rgba(16,24,40,0.06)]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B7B7B]">
                Комната #{round.room_id}
              </p>
              <p className="mt-1 text-[18px] font-black text-[#111]">{round.jackpot} ₽</p>
              <div className="mt-2 flex items-center justify-between text-[12px]">
                <span className="text-[#7B7B7B]">Взнос</span>
                <span className="font-semibold text-[#111]">{round.entry_cost} ₽</span>
              </div>
              <p className="mt-2 text-[11px] text-[#7B7B7B]">
                {new Date(round.start_time).toLocaleDateString('ru-RU')}
              </p>
            </article>
          ))}
      </div>
    </div>
  )
}
