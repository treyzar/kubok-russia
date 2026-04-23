import { useQuery } from '@tanstack/react-query'

import { ApiClientError, getRoundDetails } from '@shared/api'
import type { RoomWinner, Round } from '@shared/types'
import { useState } from 'react'

type JournalModalProps = {
  rounds: Round[]
  winners: RoomWinner[]
  onClose: () => void
}

export function JournalModal({ rounds, winners, onClose }: JournalModalProps) {
  const [expandedRoundId, setExpandedRoundId] = useState<number | null>(null)

  const detailsQuery = useQuery({
    queryKey: ['round-details', expandedRoundId],
    queryFn: () => getRoundDetails(expandedRoundId!),
    enabled: expandedRoundId !== null,
  })

  function handleRoundClick(roomId: number) {
    setExpandedRoundId((prev) => (prev === roomId ? null : roomId))
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-h-full w-full max-w-[920px] overflow-y-auto rounded-[18px] border border-[#3E4758] bg-[#141922] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[28px] font-bold text-[#ADE562]">Журнал раундов</h2>
          <button
            className="rounded-md border border-white/20 bg-black/35 px-3 py-2 text-sm font-semibold text-white hover:bg-black/55"
            onClick={onClose}
            type="button"
          >
            Закрыть
          </button>
        </div>

        {rounds.length === 0 && winners.length === 0 ? (
          <p className="mt-3 rounded-[10px] border border-[#3D4557] bg-[#1A2231] px-3 py-2 text-[14px] text-[#CAD4E2]">История пока пуста.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {winners.map((winner) => (
              <article
                className="rounded-[12px] border border-[#3A4C67] bg-[#1D2A3C] px-3 py-3 text-[14px]"
                key={`${winner.room_id}-${winner.user_id}-${winner.won_at}`}
              >
                <p className="text-[#AAB8CC]">
                  Комната {winner.room_id} · {new Date(winner.won_at).toLocaleString('ru-RU')}
                </p>
                <p className="mt-1 text-[17px] font-bold text-[#EBF2FF]">Победитель ID: {winner.user_id}</p>
                <p className="mt-1 text-[#9FD0A8]">Приз: {winner.prize.toLocaleString('ru-RU')}</p>
              </article>
            ))}

            {rounds.map((round) => {
              const isExpanded = expandedRoundId === round.room_id
              const isLoadingDetails = isExpanded && detailsQuery.isFetching
              const details = isExpanded ? detailsQuery.data : undefined
              const detailsError = isExpanded ? detailsQuery.error : undefined

              return (
                <article className="rounded-[12px] border border-[#364154] bg-[#1B2433] px-3 py-3 text-[14px]" key={round.room_id}>
                  <button
                    className="w-full text-left"
                    onClick={() => handleRoundClick(round.room_id)}
                    type="button"
                  >
                    <p className="text-[#AAB8CC]">
                      {round.winner?.won_at ? new Date(round.winner.won_at).toLocaleString('ru-RU') : 'Время неизвестно'} · Комната {round.room_id}
                    </p>
                    <p className="mt-1 text-[17px] font-bold text-[#EBF2FF]">Победитель ID: {round.winner?.user_id ?? '—'}</p>
                    <p className="mt-1 text-[#D7E0EE]">
                      Участники: {round.players.length}, бустов: {round.boosts.length}, фонд: {round.jackpot.toLocaleString('ru-RU')}, приз:{' '}
                      {round.winner?.prize?.toLocaleString('ru-RU') ?? '0'}
                    </p>
                    <p className="mt-1 text-[#C3D8FF]">Ставка входа: {round.entry_cost.toLocaleString('ru-RU')}</p>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 border-t border-[#2E3A4E] pt-3">
                      {isLoadingDetails && (
                        <p className="text-[13px] text-[#8A9BB5]">Загружаем детали...</p>
                      )}

                      {!isLoadingDetails && detailsError && (
                        <p className="text-[13px] text-[#FFB3B3]">
                          {detailsError instanceof ApiClientError && detailsError.status === 404
                            ? 'Детали раунда недоступны'
                            : 'Не удалось загрузить детали раунда'}
                        </p>
                      )}

                      {!isLoadingDetails && details && (
                        <div className="space-y-3">
                          <div>
                            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#7A8FA8]">Игроки</p>
                            {details.players.length === 0 ? (
                              <p className="mt-1 text-[13px] text-[#8A9BB5]">Нет данных об игроках</p>
                            ) : (
                              <ul className="mt-1 space-y-1">
                                {details.players.map((player) => (
                                  <li className="rounded-[8px] bg-[#1D2A3C] px-2 py-1.5 text-[13px] text-[#C8D8EE]" key={`${player.user_id}-${player.joined_at}`}>
                                    ID: {player.user_id} · Место: {player.places} · Вошёл: {new Date(player.joined_at).toLocaleString('ru-RU')}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div>
                            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#7A8FA8]">Бусты</p>
                            {details.boosts.length === 0 ? (
                              <p className="mt-1 text-[13px] text-[#8A9BB5]">Нет бустов</p>
                            ) : (
                              <ul className="mt-1 space-y-1">
                                {details.boosts.map((boost) => (
                                  <li className="rounded-[8px] bg-[#1D2A3C] px-2 py-1.5 text-[13px] text-[#C8D8EE]" key={`${boost.user_id}-${boost.boosted_at}`}>
                                    ID: {boost.user_id} · Сумма: {boost.amount.toLocaleString('ru-RU')} · Время: {new Date(boost.boosted_at).toLocaleString('ru-RU')}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
