import { Settings } from 'lucide-react'

import { useBodyScrollLock } from '@shared/lib'
import { AppHeader } from '@widgets/header'

import { useLobby } from '../lib'
import { SIDE_PLAYERS, type LobbyPageProps } from '../model'
import { JournalModal } from './journal-modal'
import { PlayerAvatar } from './player-avatar'
import { SimulationModal } from './simulation-modal'

const JOIN_PREFILL_AFFORDABLE_KEY = 'kubok26.join.prefill.affordable'

export function LobbyPage({ roomId, onBackToGames, onCreateGame, onPlayAgain, onStartGame, onLogout, onUserBalanceChange, user }: LobbyPageProps) {
  useBodyScrollLock()

  const {
    copied,
    isSimulationOpen,
    setIsSimulationOpen,
    isJournalOpen,
    setIsJournalOpen,
    handleCopyCode,
    handleLeaveRoomAndExit,
    room,
    playersCount,
    boostsCount,
    isLoadingLobby,
    lobbyError,
    boostAmount,
    setBoostAmount,
    handleBuyBoost,
    isBuyingBoost,
    hasPurchasedBoost,
    boostError,
    winners,
    rounds,
    isLeavingLobby,
    countdownLabel,
    desiredProbability,
    setDesiredProbability,
    boostProbability,
    requiredBoostAmount,
    insufficientFunds,
    closeInsufficientFunds,
  } = useLobby({ roomId, onStartGame, userId: user.id, userName: user.name, userBalance: user.balance, onUserBalanceChange })

  const roomStatus = room?.status ?? 'new'
  const activeRoomId = room?.room_id ?? roomId
  const roomJackpot = room?.jackpot ?? 0
  const latestWinner = winners[0] ?? null
  const isFinished = roomStatus === 'finished'

  return (
    <main className="fixed inset-0 flex min-h-dvh flex-col overflow-hidden bg-[#15161C] text-[#F2F3F5]">
      <AppHeader onBrandClick={onBackToGames} onCreateGame={onCreateGame} onLogout={onLogout} user={user} />

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
          <span className="font-extrabold">{countdownLabel}</span>
        </div>

        <div className="absolute left-[2.5%] top-[12.5%] z-20 w-[min(420px,80vw)] rounded-[12px] border border-[#41454F] bg-[#2A2D33]/92 px-3 py-2 text-[13px] text-[#EEF1F7] shadow-[0_6px_16px_rgba(0,0,0,0.34)]">
          <p>
            Комната: {activeRoomId} · Статус: {roomStatus}
          </p>
          <p>
            Игроков: {playersCount} · Бустов: {boostsCount} · Джекпот: {roomJackpot.toLocaleString('ru-RU')}
          </p>
          {latestWinner ? <p>Последний победитель: ID {latestWinner.user_id}, приз {latestWinner.prize.toLocaleString('ru-RU')}</p> : null}
          {isLoadingLobby ? <p className="text-[#C8CDD8]">Загружаем данные лобби...</p> : null}
          {lobbyError ? <p className="text-[#FFD3D3]">{lobbyError}</p> : null}

          <div className="mt-2 flex items-center gap-2">
            <input
              className="h-8 w-[120px] rounded-[8px] border border-[#4A4F5B] bg-[#17191E] px-2 text-[#EEF1F7]"
              onChange={(e) => setBoostAmount(e.target.value)}
              value={boostAmount}
            />
            <button
              className="h-8 rounded-[8px] border border-[#8A62FF] bg-[#3E2A6B] px-3 text-[12px] font-semibold text-white hover:bg-[#4B3380]"
              disabled={isBuyingBoost || hasPurchasedBoost}
              onClick={() => {
                void handleBuyBoost()
              }}
              type="button"
            >
              {isBuyingBoost ? 'Покупка...' : hasPurchasedBoost ? 'Буст уже куплен' : 'Купить буст'}
            </button>
          </div>
          {hasPurchasedBoost ? <p className="mt-1 text-[#C8CDD8]">Вы уже купили буст для этой комнаты.</p> : null}

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="text-[12px] text-[#C8CDD8]">
              Целевая вероятность, %
              <input
                className="mt-1 h-8 w-full rounded-[8px] border border-[#4A4F5B] bg-[#17191E] px-2 text-[#EEF1F7]"
                onChange={(e) => setDesiredProbability(e.target.value)}
                value={desiredProbability}
              />
            </label>
            <div className="text-[12px] text-[#C8CDD8]">
              <p>Оценка шанса: {boostProbability !== null ? `${boostProbability.toFixed(2)}%` : '—'}</p>
              <p>Нужно для цели: {requiredBoostAmount !== null ? requiredBoostAmount.toLocaleString('ru-RU') : '—'}</p>
            </div>
          </div>
          {boostError ? <p className="mt-1 text-[#FFD3D3]">{boostError}</p> : null}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 max-[900px]:hidden">
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
          aria-label="Покинуть лобби"
          className="absolute z-20 inline-flex h-[50px] cursor-pointer items-center justify-center rounded-[9px] border border-[#B24B4B] bg-[#5A2323] px-3 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.42)] transition hover:bg-[#6D2B2B]"
          disabled={isLeavingLobby}
          onClick={() => {
            const shouldLeave = window.confirm('Точно покинуть лобби?')
            if (!shouldLeave) return
            void handleLeaveRoomAndExit(onBackToGames)
          }}
          style={{ bottom: '3.8%', left: '7.5%' }}
          type="button"
        >
          {isLeavingLobby ? 'Выходим...' : 'Покинуть лобби'}
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
          disabled={isFinished}
          onClick={onStartGame}
          style={{ bottom: '3.8%', right: '2.5%' }}
          type="button"
        >
          <span className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-[7px] border border-white/20 bg-[#15171B] text-[30px] font-black text-[#F5F6F8]">E</span>
          <span className="whitespace-nowrap uppercase">{isFinished ? 'Раунд завершён' : 'Начать игру'}</span>
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
          <div className="pointer-events-none absolute bottom-[14%] left-1/2 z-30 -translate-x-1/2 rounded-[10px] bg-black/82 px-4 py-2 text-[14px] font-semibold text-white">Код комнаты скопирован</div>
        ) : null}

        {isFinished ? (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-[520px] rounded-[16px] border border-[#4E6689] bg-[#172334] p-5 text-[#EAF2FF] shadow-[0_14px_36px_rgba(0,0,0,0.45)]">
              <p className="text-[12px] uppercase tracking-[0.08em] text-[#9EB7D7]">Раунд завершён</p>
              <h3 className="mt-1 text-[28px] font-extrabold">Итоги игры</h3>
              {latestWinner ? (
                <div className="mt-3 rounded-[12px] border border-[#3A4C67] bg-[#1D2A3C] px-4 py-3">
                  <p>Победитель: ID {latestWinner.user_id}</p>
                  <p>Приз: {latestWinner.prize.toLocaleString('ru-RU')}</p>
                  <p>{new Date(latestWinner.won_at).toLocaleString('ru-RU')}</p>
                </div>
              ) : (
                <p className="mt-3 rounded-[12px] border border-[#3A4C67] bg-[#1D2A3C] px-4 py-3">Данные победителя пока недоступны.</p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  className="h-10 rounded-[10px] border border-[#7A52FF] bg-[#5B35D2] px-4 text-[14px] font-bold text-white hover:brightness-105"
                  onClick={onPlayAgain}
                  type="button"
                >
                  Играть снова
                </button>
                <button
                  className="h-10 rounded-[10px] border border-[#4E6689] bg-[#233752] px-4 text-[14px] font-bold text-[#DDEAFF] hover:brightness-105"
                  onClick={onBackToGames}
                  type="button"
                >
                  На главную
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {isSimulationOpen ? (
        <SimulationModal boostsCount={boostsCount} onClose={() => setIsSimulationOpen(false)} playersCount={playersCount} room={room} winners={winners} />
      ) : null}
      {isJournalOpen ? <JournalModal onClose={() => setIsJournalOpen(false)} rounds={rounds} winners={winners} /> : null}

      {insufficientFunds ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-[460px] rounded-[14px] border border-[#6A3F3F] bg-[#24181B] p-4 text-[#F8E8E8]">
            <h3 className="text-[22px] font-bold">Недостаточно баллов</h3>
            <p className="mt-2 text-[14px] text-[#F1D0D0]">{insufficientFunds.message}</p>
            <div className="mt-3 space-y-1 rounded-[10px] border border-[#5A3232] bg-[#2C1B1B] px-3 py-2 text-[14px]">
              <p>Нужно: {insufficientFunds.required.toLocaleString('ru-RU')}</p>
              <p>Доступно: {insufficientFunds.currentBalance.toLocaleString('ru-RU')}</p>
              <p>Не хватает: {insufficientFunds.shortfall.toLocaleString('ru-RU')}</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="h-9 rounded-[8px] border border-[#3D5876] bg-[#1E344A] px-3 text-[13px] font-semibold text-white hover:bg-[#24415C]"
                onClick={() => {
                  window.localStorage.setItem(JOIN_PREFILL_AFFORDABLE_KEY, '1')
                  closeInsufficientFunds()
                  onPlayAgain()
                }}
                type="button"
              >
                Найти дешевле
              </button>
              <button
                className="h-9 rounded-[8px] border border-[#8A5252] bg-[#4B2A2A] px-3 text-[13px] font-semibold text-white hover:bg-[#5A3131]"
                onClick={closeInsufficientFunds}
                type="button"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
