import { Crown, DoorOpen, Gauge, RefreshCw, Rocket, ShieldCheck, Timer, Trophy, Users } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@shared/ui'

import type { BoostState, ParticipantOdds, RoomActions, RoomConfig, RoomState, RoundHistoryItem, RoundTimelineEvent } from '../model'

type RoomShellProps = {
  room: RoomState
  roomConfig: RoomConfig
  participants: ParticipantOdds[]
  boost: BoostState
  timeline: RoundTimelineEvent[]
  roundHistory: RoundHistoryItem[]
  currentBalance: number
  selectedParticipantId: string | null
  errorMessage: string
  actions: RoomActions
  children: ReactNode
}

function phaseLabel(room: RoomState): string {
  if (room.phase === 'countdown') {
    return `До старта: ${room.countdownSeconds} сек`
  }
  if (room.phase === 'playing') {
    return `Раунд в игре: ${room.playingSeconds} сек`
  }
  if (room.phase === 'finished') {
    return 'Раунд завершён'
  }
  if (room.phase === 'filling') {
    return 'Заполнение комнаты'
  }
  return 'Ожидание запуска'
}

export function RoomShell({
  room,
  roomConfig,
  participants,
  boost,
  timeline,
  roundHistory,
  currentBalance,
  selectedParticipantId,
  errorMessage,
  actions,
  children,
}: RoomShellProps) {
  const winner = room.winnerId ? participants.find((item) => item.id === room.winnerId) : null

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0E1013] text-[#F5F7FA]">
      <div className="auth-aurora auth-aurora--one" />
      <div className="auth-aurora auth-aurora--two" />
      <div className="auth-aurora auth-aurora--three" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
        <header className="rounded-3xl border border-[#2E333A] bg-[#171B22]/95 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-wide text-[#9AA4B2] uppercase">Room Shell Template</p>
              <h1 className="mt-1 text-xl font-semibold text-[#F8FAFC] sm:text-2xl">{room.title}</h1>
              <p className="mt-1 inline-flex items-center gap-2 text-sm text-[#BAC4D1]">
                <Timer size={14} />
                {phaseLabel(room)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-[#2F3640] bg-[#12161D] px-3 py-2 text-sm text-[#D5DCE5]">
                Баланс: <span className="font-semibold text-[#FFE129]">{currentBalance.toLocaleString('ru-RU')}</span>
              </div>
              <Button className="rounded-xl border-[#3A404A] bg-[#141923] text-[#E6ECF5] hover:bg-[#1D2430]" onClick={actions.refreshRoom} variant="outline">
                <RefreshCw size={15} />
                Рефреш
              </Button>
              <Button className="rounded-xl border-[#3A404A] bg-[#141923] text-[#E6ECF5] hover:bg-[#1D2430]" onClick={actions.leaveRoom} variant="outline">
                <DoorOpen size={15} />
                Выйти
              </Button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-3xl border border-[#2E333A] bg-[#171B22]/95 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-[#F1F5F9]">
                <Gauge size={18} />
                Game Canvas Slot
              </h2>
              <div className="rounded-lg border border-[#323A45] bg-[#12161D] px-2.5 py-1 text-xs text-[#AAB4C3]">
                Мест: {room.seatsTaken}/{room.seatsTotal} • Фонд: {room.jackpot.toLocaleString('ru-RU')}
              </div>
            </div>

            <div className="min-h-[320px] rounded-2xl border border-[#313843] bg-[radial-gradient(circle_at_20%_10%,rgba(255,225,41,0.16),transparent_35%),linear-gradient(180deg,#11151D_0%,#0D1016_100%)] p-4">
              {children}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button className="rounded-xl bg-[#FFE129] text-[#181A1F] hover:bg-[#EED219]" onClick={actions.buyBoost}>
                <Rocket size={16} />
                Купить буст ({boost.price} баллов)
              </Button>
              <Button className="rounded-xl border-[#3A404A] bg-[#141923] text-[#E6ECF5] hover:bg-[#1D2430]" onClick={actions.joinRoom} variant="outline">
                <ShieldCheck size={16} />
                Заполнить комнату
              </Button>
              <Button className="rounded-xl border-[#3A404A] bg-[#141923] text-[#E6ECF5] hover:bg-[#1D2430]" onClick={actions.repeatRound} variant="outline">
                <Trophy size={16} />
                Повторить
              </Button>
            </div>

            <p className="mt-2 text-xs text-[#9EA8B7]">
              Буст даёт +{boost.chanceBonusPercent}% к весу текущего игрока. Фонд победителя: {roomConfig.prizeFundPercent}%.
            </p>
            {boost.disabledReason ? (
              <p className="mt-2 rounded-lg border border-[#555F72] bg-[#1A202B] px-3 py-2 text-sm text-[#C8D2E2]">{boost.disabledReason}</p>
            ) : null}
            {errorMessage ? (
              <p className="mt-2 rounded-lg border border-[#A13A3A] bg-[#3A1C1C]/80 px-3 py-2 text-sm text-[#FFCACA]">{errorMessage}</p>
            ) : null}
            {winner ? (
              <p className="mt-2 rounded-lg border border-[#5A4A12] bg-[#3B3212]/80 px-3 py-2 text-sm text-[#FFECA6]">
                Победитель текущего раунда: <span className="font-semibold">{winner.name}</span>
              </p>
            ) : null}
            {room.phase === 'finished' ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button className="rounded-xl bg-[#A8E45E] text-[#101114] hover:bg-[#B8EE75]" onClick={actions.repeatRound}>
                  Быстрый повтор
                </Button>
                <Button className="rounded-xl border-[#3A404A] bg-[#141923] text-[#E6ECF5] hover:bg-[#1D2430]" onClick={actions.refreshRoom} variant="outline">
                  Подобрать похожую комнату
                </Button>
              </div>
            ) : null}
          </article>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-[#2E333A] bg-[#171B22]/95 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-5">
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[#F3F6FA]">
                <Users size={16} />
                Рейтинг вероятностей
              </h3>
              <ul className="mt-3 space-y-2">
                {participants
                  .slice()
                  .sort((a, b) => b.finalChance - a.finalChance)
                  .map((participant, index) => {
                    const selected = selectedParticipantId === participant.id
                    return (
                      <li key={participant.id}>
                        <button
                          className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                            selected
                              ? 'border-[#FFE129] bg-[#2A2B19]'
                              : 'border-[#353D48] bg-[#12161D] hover:border-[#5C6675]'
                          }`}
                          onClick={() => actions.selectParticipant(participant.id)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[#EAF0F7]">
                              {index === 0 ? <Crown className="mr-1 inline" size={14} /> : null}
                              {participant.name}
                              {participant.isCurrentUser ? ' (вы)' : participant.isBot ? ' (бот)' : ''}
                            </p>
                            <p className="text-sm font-semibold text-[#FFE129]">{participant.finalChance}%</p>
                          </div>
                          <p className="mt-1 text-xs text-[#9BA7B8]">Место #{participant.seat} • Буст: +{participant.boostPoints}%</p>
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </section>

            <section className="rounded-3xl border border-[#2E333A] bg-[#171B22]/95 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-5">
              <h3 className="text-base font-semibold text-[#F3F6FA]">Лента событий</h3>
              <ul className="mt-3 space-y-2">
                {timeline.map((event) => (
                  <li className="rounded-lg border border-[#323944] bg-[#12161D] px-3 py-2" key={event.id}>
                    <p className="text-xs text-[#99A3B2]">{event.at}</p>
                    <p className="text-sm text-[#E5EBF3]">{event.text}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-3xl border border-[#2E333A] bg-[#171B22]/95 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:p-5">
              <h3 className="text-base font-semibold text-[#F3F6FA]">Журнал раундов</h3>
              {roundHistory.length === 0 ? (
                <p className="mt-2 text-sm text-[#9EA8B7]">Пока нет завершенных раундов. Запустите игру для проверки прозрачности результата.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {roundHistory.map((item) => (
                    <li className="rounded-lg border border-[#323944] bg-[#12161D] px-3 py-2" key={item.id}>
                      <p className="text-xs text-[#99A3B2]">{item.finishedAt}</p>
                      <p className="text-sm font-semibold text-[#E5EBF3]">{item.winnerName}</p>
                      <p className="text-xs text-[#B9C6D9]">
                        Игроков: {item.participantsTotal} (ботов: {item.botsTotal}) • Фонд: {item.jackpot.toLocaleString('ru-RU')} •
                        Приз: {item.prize.toLocaleString('ru-RU')}
                      </p>
                      <p className="mt-1 text-xs text-[#8EA6C7]">{item.winnerReason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </section>
      </section>
    </main>
  )
}
