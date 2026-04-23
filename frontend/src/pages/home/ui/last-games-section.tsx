import { ArrowLeft, ArrowRight, Trophy } from 'lucide-react'
import { Button } from '@shared/ui'
import { useLastGames } from '../lib/use-last-games'

export function LastGamesSection() {
  const { rounds, isLoading, isError } = useLastGames()

  return (
    <div className="mt-6">
      <h2 className="inline-flex items-center gap-2 text-[2rem] font-semibold text-[#A8E45E]">
        <Trophy className="size-6" />
        Последние игры
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {isLoading && (
          <p className="col-span-full text-[#A9ACB4]">Загрузка...</p>
        )}
        {isError && (
          <p className="col-span-full text-red-400">Не удалось загрузить последние игры</p>
        )}
        {!isLoading && !isError && rounds.length === 0 && (
          <p className="col-span-full text-[#A9ACB4]">Игр пока нет</p>
        )}
        {!isLoading && !isError && rounds.map((round) => (
          <article key={round.room_id}>
            <div className="overflow-hidden rounded-[14px] bg-[#1A1B21] p-3">
              <p className="text-xs text-[#A9ACB4]">Комната #{round.room_id}</p>
              <p className="mt-1 text-[1rem] font-semibold text-[#A8E45E]">{round.jackpot} ₽</p>
              <p className="text-xs text-[#A9ACB4]">Взнос: {round.entry_cost} ₽</p>
            </div>
            <p className="mt-2 text-[0.85rem] text-[#A9ACB4]">
              {new Date(round.start_time).toLocaleDateString('ru-RU')}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button
          className="h-9 w-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] p-0"
          type="button"
          variant="outline"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          className="h-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] px-4 text-[0.95rem]"
          type="button"
          variant="outline"
        >
          Все игры
        </Button>
        <Button
          className="h-9 w-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] p-0"
          type="button"
          variant="outline"
        >
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
