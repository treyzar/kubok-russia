import { Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { RoomShell, useRoomMockStore } from '@features/room-menu'
import { useBodyScrollLock } from '@shared/lib'
import { AppHeader } from '@widgets/header'

import { SIDE_PLAYERS, type LobbyPageProps } from '../model'
import { PlayerAvatar } from './player-avatar'

export function LobbyPage({ onBackToGames, onCreateGame, onStartGame, user }: LobbyPageProps) {
  const [copied, setCopied] = useState(false)
  const [isSimulationOpen, setIsSimulationOpen] = useState(false)
  const [isJournalOpen, setIsJournalOpen] = useState(false)
  const copyTimerRef = useRef<number | null>(null)
  const roomStore = useRoomMockStore({ user, onLeaveRoom: onBackToGames })

  useBodyScrollLock()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() === 'e') {
        onStartGame()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onStartGame])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  async function handleCopyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText('STNBGH')
      setCopied(true)
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="fixed inset-0 flex min-h-dvh flex-col overflow-hidden bg-[#15161C] text-[#F2F3F5]">
      <AppHeader onBrandClick={onBackToGames} onCreateGame={onCreateGame} user={user} />

      <section className="relative flex-1 overflow-hidden bg-[#D5D8DA]">
        <img
          alt="Лобби игры"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
          draggable={false}
          src="/dev-assets/lobby_background.svg"
        />

        <div
          className="absolute z-20 inline-flex items-center gap-2 rounded-[12px] border border-[#41454F] bg-[#2A2D33] px-4 py-2.5 text-[clamp(17px,2vw,30px)] leading-none text-[#EEF1F7] shadow-[0_6px_16px_rgba(0,0,0,0.34)]"
          style={{ left: '50%', top: '2.2%', transform: 'translateX(-50%)' }}
        >
          <span className="font-medium">До начала:</span>
          <span className="font-extrabold">00:30</span>
        </div>

        <div className="absolute inset-0 z-20 max-[900px]:hidden">
          {SIDE_PLAYERS.map((player) => (
            <div className="absolute" key={player.id} style={{ right: player.right, top: player.top }}>
              <PlayerAvatar face={player.face} size="72px" />
            </div>
          ))}

          <div
            className="absolute flex h-[72px] w-[72px] items-center justify-center rounded-full border-[4px] border-dashed border-black text-[38px] leading-none font-black text-black"
            style={{ right: '12.5%', top: '65.0%' }}
          >
            +3
          </div>
        </div>

        <button
          aria-label="Открыть настройки"
          className="absolute z-20 inline-flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-[9px] border border-white/12 bg-[#1F2025] text-[#F3F4F8] shadow-[0_4px_12px_rgba(0,0,0,0.42)] transition hover:bg-[#282A30]"
          style={{ bottom: '3.8%', left: '2.5%' }}
          type="button"
        >
          <Settings className="size-[25px]" strokeWidth={2.4} />
        </button>

        <button
          aria-label="Скопировать код комнаты"
          className="absolute z-10 cursor-pointer rounded-[12px] bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8E45E]"
          onClick={handleCopyCode}
          style={{ height: '12.6%', left: '34.3%', top: '47.8%', width: '28.5%' }}
          type="button"
        />

        <button
          aria-label="Начать игру"
          className="absolute z-20 inline-flex h-[80px] cursor-pointer items-center gap-3 rounded-[10px] border border-[#8FCA4B] bg-[#ACE45D] px-3.5 text-[32px] leading-none font-extrabold tracking-[0.01em] text-[#111212] shadow-[0_8px_14px_rgba(0,0,0,0.28)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4FFD8]"
          onClick={onStartGame}
          style={{ bottom: '3.8%', right: '2.5%' }}
          type="button"
        >
          <span className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-[7px] border border-white/20 bg-[#15171B] text-[30px] font-black text-[#F5F6F8]">
            E
          </span>
          <span className="whitespace-nowrap uppercase">Начать игру</span>
        </button>
        <button
          aria-label="Открыть симуляцию раунда"
          className="absolute z-20 inline-flex h-[56px] items-center justify-center rounded-[10px] border border-[#7A52FF] bg-[#5B35D2] px-6 text-[22px] leading-none font-extrabold tracking-[0.01em] text-white shadow-[0_8px_14px_rgba(0,0,0,0.28)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6C7FF]"
          onClick={() => setIsSimulationOpen(true)}
          style={{ bottom: '3.8%', left: '50%', transform: 'translateX(-50%)' }}
          type="button"
        >
          Симуляция раунда
        </button>
        <button
          aria-label="Открыть журнал раундов"
          className="absolute z-20 inline-flex h-[48px] items-center justify-center rounded-[10px] border border-[#4E6689] bg-[#233752] px-4 text-[18px] font-bold text-[#DDEAFF] shadow-[0_8px_14px_rgba(0,0,0,0.28)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9D7FF]"
          onClick={() => setIsJournalOpen(true)}
          style={{ bottom: '12.2%', left: '50%', transform: 'translateX(-50%)' }}
          type="button"
        >
          Журнал раундов
        </button>

        {copied ? (
          <div className="pointer-events-none absolute bottom-[14%] left-1/2 z-30 -translate-x-1/2 rounded-[10px] bg-black/82 px-4 py-2 text-[14px] font-semibold text-white">
            Код комнаты скопирован
          </div>
        ) : null}
      </section>
      {isSimulationOpen ? (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm">
          <div className="absolute right-5 top-5 z-10 flex gap-2">
            <button
              className="rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm font-semibold text-white hover:bg-black/55"
              onClick={() => setIsSimulationOpen(false)}
              type="button"
            >
              Закрыть
            </button>
          </div>
          <RoomShell
            actions={roomStore.actions}
            boost={roomStore.boost}
            currentBalance={roomStore.currentBalance}
            errorMessage={roomStore.errorMessage}
            participants={roomStore.participants}
            room={roomStore.room}
            roomConfig={roomStore.roomConfig}
            roundHistory={roomStore.roundHistory}
            selectedParticipantId={roomStore.selectedParticipantId}
            timeline={roomStore.timeline}
          >
            <div className="grid h-full place-items-center">
              <div className="max-w-[470px] rounded-2xl border border-[#3D4350] bg-[#0D1118]/85 p-5 text-center">
                <p className="text-[0.92rem] uppercase tracking-[0.08em] text-[#90A4C4]">Демонстрация визуального раунда</p>
                <h2 className="mt-2 text-[1.6rem] font-extrabold text-[#F0F4FA]">Победитель определяется прозрачно</h2>
                <p className="mt-2 text-[0.98rem] text-[#B6C5DB]">
                  Эта сцена отражает backend-логику: шансы, бусты и итоговый выбор победителя. После завершения используйте
                  «Быстрый повтор» для непрерывного цикла.
                </p>
              </div>
            </div>
          </RoomShell>
        </div>
      ) : null}
      {isJournalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto max-h-full w-full max-w-[920px] overflow-y-auto rounded-[18px] border border-[#3E4758] bg-[#141922] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[28px] font-bold text-[#ADE562]">Журнал раундов</h2>
              <button
                className="rounded-md border border-white/20 bg-black/35 px-3 py-2 text-sm font-semibold text-white hover:bg-black/55"
                onClick={() => setIsJournalOpen(false)}
                type="button"
              >
                Закрыть
              </button>
            </div>
            {roomStore.roundHistory.length === 0 ? (
              <p className="mt-3 rounded-[10px] border border-[#3D4557] bg-[#1A2231] px-3 py-2 text-[14px] text-[#CAD4E2]">
                История пока пуста. Запустите «Симуляцию раунда» и завершите игру.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {roomStore.roundHistory.map((item) => (
                  <article className="rounded-[12px] border border-[#364154] bg-[#1B2433] px-3 py-3 text-[14px]" key={item.id}>
                    <p className="text-[#AAB8CC]">{item.finishedAt} • Комната {item.roomId}</p>
                    <p className="mt-1 text-[17px] font-bold text-[#EBF2FF]">{item.winnerName}</p>
                    <p className="mt-1 text-[#D7E0EE]">
                      Участники: {item.participantsTotal}, боты: {item.botsTotal}, фонд: {item.jackpot.toLocaleString('ru-RU')}, приз:{' '}
                      {item.prize.toLocaleString('ru-RU')}
                    </p>
                    <p className="mt-1 text-[#C3D8FF]">{item.winnerReason}</p>
                    <p className="mt-1 text-[#9FD0A8]">
                      Изменение баланса игрока: {item.balanceDelta > 0 ? '+' : ''}
                      {item.balanceDelta.toLocaleString('ru-RU')}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  )
}
