import type { Room, RoomWinner } from '@shared/types'

type SimulationModalProps = {
  room: Room | null
  playersCount: number
  boostsCount: number
  winners: RoomWinner[]
  onClose: () => void
}

export function SimulationModal({ room, playersCount, boostsCount, winners, onClose }: SimulationModalProps) {
  const latestWinner = winners[0] ?? null

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm">
      <div className="absolute right-5 top-5 z-10 flex gap-2">
        <button
          className="rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm font-semibold text-white hover:bg-black/55"
          onClick={onClose}
          type="button"
        >
          Закрыть
        </button>
      </div>

      <div className="grid h-full place-items-center p-6">
        <div className="w-full max-w-[620px] rounded-2xl border border-[#3D4350] bg-[#0D1118]/90 p-6 text-[#F0F4FA]">
          <p className="text-[0.92rem] uppercase tracking-[0.08em] text-[#90A4C4]">Симуляция текущего раунда</p>
          <h2 className="mt-2 text-[1.5rem] font-extrabold">Актуальные данные комнаты</h2>

          <div className="mt-4 grid gap-2 text-[0.98rem] text-[#C3D0E3]">
            <p>Комната: {room?.room_id ?? '—'}</p>
            <p>Статус: {room?.status ?? '—'}</p>
            <p>Джекпот: {(room?.jackpot ?? 0).toLocaleString('ru-RU')}</p>
            <p>Участников: {playersCount}</p>
            <p>Бустов: {boostsCount}</p>
            <p>Шансов на места: {room?.players_needed ?? 0}</p>
          </div>

          <div className="mt-4 rounded-xl border border-[#33435F] bg-[#111A29] px-4 py-3 text-[0.95rem] text-[#D8E4F4]">
            {latestWinner ? (
              <p>
                Последний winner: ID {latestWinner.user_id}, приз {latestWinner.prize.toLocaleString('ru-RU')} ({new Date(
                  latestWinner.won_at,
                ).toLocaleString('ru-RU')})
              </p>
            ) : (
              <p>Победитель пока не определён.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

