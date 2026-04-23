import { useState } from 'react'

import { useBodyScrollLock } from '@shared/lib'
import { AppHeader } from '@widgets/header'

import { useLobby } from '../lib'
import { ASSETS } from '../model/constants'
import type { LobbyPageProps } from '../model/types'
import { ChromaKeyVideo } from './chroma-key-video'
import { PlatesGrid } from './plates-grid'

const STATUS_LABEL: Record<string, string> = {
  new: 'Набор игроков',
  starting_soon: 'Скоро начнётся',
  playing: 'Игра идёт',
  finished: 'Завершено',
}

const PHASE_LABEL: Record<string, { text: string; color: string }> = {
  lobby: { text: 'Выбор тарелок', color: '#FF008A' },
  boost: { text: 'Фаза бустов', color: '#A78BFA' },
  video: { text: 'Открытие тарелок', color: '#FFD700' },
  reveal: { text: 'Розыгрыш', color: '#FFD700' },
  results: { text: 'Итоги', color: '#22C55E' },
}

export function LobbyPage({
  roomId,
  onBackToGames,
  onPlayAgain,
  onLogout,
  onUserBalanceChange,
  user,
}: LobbyPageProps) {
  useBodyScrollLock()
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const game = useLobby({
    roomId,
    userId: user.id,
    userName: user.name,
    userBalance: user.balance,
    onUserBalanceChange,
  })

  const {
    room,
    roomStatus,
    phase,
    revealSeats,
    players,
    boostsCount,
    hasJoined,
    myPlaces,
    isLoadingLobby,
    lobbyError,
    isLeavingRoom,
    countdownLabel,
    boostSecondsLeft,
    roundDuration,
    handleBuySeats,
    handleLeaveRoomAndExit,
    isBuyingSeats,
    seatError,
    selectedSeats,
    toggleSeat,
    clearSelection,
    maxPlacesToBuy,
    freeSeats,
    totalSeats,
    apiUserId,
    entryCost,
    totalCost,
    playersWithProbabilities,
    myProbability,
    hasPurchasedBoost,
    boostMode,
    setBoostMode,
    boostAmount,
    setBoostAmount,
    boostProbInput,
    setBoostProbInput,
    boostPreviewProbability,
    boostRequiredAmount,
    boostCalcProbLoading,
    boostCalcAmountLoading,
    buyBoostMutation,
    boostError,
    handleVideoEnded,
    isWinner,
    winner,
  } = game

  const jackpot = room?.jackpot ?? 0
  const playersJoined = players.reduce((sum, p) => sum + p.places, 0)
  const phaseInfo = PHASE_LABEL[phase] ?? PHASE_LABEL.lobby

  const dotClass = {
    new: 'animate-pulse bg-yellow-400',
    starting_soon: 'animate-pulse bg-orange-400',
    playing: 'bg-green-400',
    finished: 'bg-gray-400',
  }[roomStatus] ?? 'bg-gray-400'

  const isLobbyPhase = phase === 'lobby'
  const isBoostPhase = phase === 'boost'

  // Boost timer pct/color
  const timerPct =
    boostSecondsLeft !== null
      ? Math.min(100, (boostSecondsLeft / Math.max(1, roundDuration)) * 100)
      : 100
  const timerColor = timerPct > 50 ? '#22C55E' : timerPct > 25 ? '#F59E0B' : '#EF4444'

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#0E0F14] text-[#F2F3F5]">
      <AppHeader onBrandClick={onBackToGames} onLogout={onLogout} user={user} />

      <section className="relative flex flex-1 flex-col overflow-hidden">
        <img
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center opacity-30"
          draggable={false}
          src={ASSETS.bg}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0E0F14]/70 via-transparent to-[#0E0F14]/90" />

        <div className="relative z-10 flex flex-1 flex-col gap-4 overflow-auto p-4 md:flex-row md:p-6">

          {/* Left: plates board */}
          <div className="flex flex-col gap-4 md:flex-1 md:min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] font-medium text-[#C8CDD8]">
                  <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
                  {STATUS_LABEL[roomStatus] ?? roomStatus}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-widest"
                  style={{ borderColor: `${phaseInfo.color}60`, color: phaseInfo.color, background: `${phaseInfo.color}10` }}
                >
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: phaseInfo.color }} />
                  {phaseInfo.text}
                </span>
                <span className="text-[12px] text-[#6B7280]">Комната #{roomId}</span>
              </div>

              {/* Lobby timer / waiting indicator */}
              {isLobbyPhase && (
                <div className="flex items-center gap-2 rounded-[10px] border border-orange-400/30 bg-orange-400/10 px-3 py-1.5">
                  <svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  {countdownLabel && roomStatus === 'starting_soon' ? (
                    <span className="text-[14px] font-bold text-orange-300">До начала: {countdownLabel}</span>
                  ) : (
                    <span className="text-[14px] font-bold text-orange-300">
                      Ждём игроков · {playersJoined}/{totalSeats || '?'}
                    </span>
                  )}
                </div>
              )}

              {/* Boost timer */}
              {isBoostPhase && boostSecondsLeft !== null && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-[100px] overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
                    />
                  </div>
                  <div
                    className="flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5"
                    style={{ borderColor: `${timerColor}40`, backgroundColor: `${timerColor}15` }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: timerColor }}>
                      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                    <span className="text-[15px] font-black tabular-nums" style={{ color: timerColor }}>
                      {String(Math.floor((boostSecondsLeft ?? 0) / 60)).padStart(2, '0')}:{String((boostSecondsLeft ?? 0) % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[20px] border border-white/5 bg-black/20 backdrop-blur-sm">
              {/* Video phase fills the board area */}
              {phase === 'video' ? (
                <div className="flex h-full w-full items-center justify-center bg-black/60 p-4">
                  <ChromaKeyVideo onEnded={handleVideoEnded} src={ASSETS.introVideo} />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-4 md:p-6">
                  <p className="mb-3 text-[12px] font-medium uppercase tracking-widest text-[#6B7280]">
                    {isLobbyPhase ? 'Выберите тарелки, на которые ставите' : isBoostPhase ? 'Тарелки закрыты — фаза бустов' : 'Открываем тарелки'}
                  </p>

                  {isLoadingLobby && totalSeats === 0 ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF008A] border-t-transparent" />
                      <p className="text-[13px] text-[#6B7280]">Загружаем комнату...</p>
                    </div>
                  ) : (
                    <div className="w-full max-w-[820px]">
                      <PlatesGrid
                        seats={revealSeats}
                        phase={phase}
                        selectedSeats={selectedSeats}
                        apiUserId={apiUserId}
                        hasJoined={hasJoined}
                        isMyTurnToSelect={!hasJoined && freeSeats > 0}
                        onSeatClick={toggleSeat}
                        playersWithProbabilities={playersWithProbabilities}
                      />
                    </div>
                  )}

                  {/* Legend */}
                  {isLobbyPhase && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12px] text-[#9CA3AF]">
                      <LegendDot color="rgba(255,0,138,0.85)" label="Свободно" />
                      <LegendDot color="rgba(255,0,138,1)" label="Выбрано" outline />
                      <LegendDot color="rgba(34,197,94,0.95)" label="Ваши" />
                      <LegendDot color="rgba(255,255,255,0.45)" label="Заняты другими" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: info panel — adapts per phase */}
          <div className="flex w-full flex-col gap-3 md:w-[320px] xl:w-[360px]">

            {/* Bank — always visible */}
            <div className="rounded-[16px] border border-white/5 bg-[#1A1B22]/90 p-4 backdrop-blur-sm">
              <p className="mb-1 text-[11px] uppercase tracking-widest text-[#6B7280]">Банк комнаты</p>
              <p className="text-[28px] font-black leading-none text-[#FFD700]">
                {jackpot.toLocaleString('ru-RU')}
                <span className="ml-2 text-[14px] font-medium text-[#9CA3AF]">STL</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#9CA3AF]">
                <span>Вход: <strong className="text-[#F2F3F5]">{entryCost.toLocaleString('ru-RU')} STL</strong></span>
                <span>Бустов: <strong className="text-[#F2F3F5]">{boostsCount}</strong></span>
              </div>
              {myProbability !== null && (isBoostPhase || phase === 'reveal') && (
                <div className="mt-3 flex items-center gap-2 rounded-[8px] bg-white/5 px-3 py-2">
                  <span className="text-[12px] text-[#9CA3AF]">Ваш шанс победы:</span>
                  <span className="ml-auto text-[15px] font-bold text-[#A78BFA]">{myProbability.toFixed(1)}%</span>
                </div>
              )}
            </div>

            {/* Players list */}
            <div className="overflow-hidden rounded-[16px] border border-white/5 bg-[#1A1B22]/90 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
                <p className="text-[12px] font-semibold text-[#F2F3F5]">
                  {isBoostPhase || phase === 'reveal' ? 'Вероятности победы' : 'Игроки'}
                </p>
                <span className="text-[12px] text-[#6B7280]">{playersJoined} / {totalSeats || '?'} мест</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto px-3 py-2">
                {isLoadingLobby && players.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">Загрузка...</p>
                ) : players.length === 0 ? (
                  <p className="text-[12px] text-[#6B7280]">Пока никого нет. Будьте первым!</p>
                ) : isBoostPhase || phase === 'reveal' || phase === 'results' ? (
                  <ul className="space-y-1.5">
                    {[...playersWithProbabilities]
                      .sort((a, b) => b.probability - a.probability)
                      .map((player, idx) => (
                        <li
                          key={player.userId}
                          className={`relative overflow-hidden rounded-[8px] px-3 py-2 ${player.isMe ? 'border border-[#A78BFA]/30 bg-[#A78BFA]/10' : 'bg-white/5'}`}
                        >
                          <div className="relative z-10 flex items-center gap-2">
                            <span className={`text-[11px] font-bold ${idx === 0 ? 'text-[#FFD700]' : 'text-[#6B7280]'}`}>
                              #{idx + 1}
                            </span>
                            <span className="flex-1 truncate text-[12px] font-medium text-[#D1D5DB]">
                              {player.isMe ? '← Вы' : `Игрок ${player.userId}`}
                            </span>
                            {player.boostAmount > 0 && (
                              <span className="text-[10px] text-[#22C55E]" title={`Буст: ${player.boostAmount} STL`}>🚀</span>
                            )}
                            <span className={`text-[12px] font-bold ${player.isMe ? 'text-[#A78BFA]' : 'text-[#F2F3F5]'}`}>
                              {player.probability.toFixed(1)}%
                            </span>
                          </div>
                          <div
                            className="absolute bottom-0 left-0 h-0.5 rounded-full opacity-30 transition-all duration-700"
                            style={{
                              width: `${Math.min(100, player.probability)}%`,
                              backgroundColor: player.isMe ? '#A78BFA' : '#6B7280',
                            }}
                          />
                        </li>
                      ))}
                  </ul>
                ) : (
                  <ul className="space-y-1.5">
                    {players.map((player) => {
                      const isMe = player.user_id === apiUserId
                      return (
                        <li
                          key={player.user_id}
                          className={`flex items-center justify-between rounded-[8px] px-3 py-2 ${isMe ? 'border border-[#22C55E]/20 bg-[#22C55E]/10' : 'bg-white/5'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${isMe ? 'bg-[#22C55E] text-black' : 'bg-white/10 text-[#9CA3AF]'}`}>
                              {isMe ? 'Я' : player.user_id.toString().slice(-2)}
                            </div>
                            <span className={`text-[13px] font-medium ${isMe ? 'text-[#22C55E]' : 'text-[#D1D5DB]'}`}>
                              {isMe ? user.name : `Игрок ${player.user_id}`}
                            </span>
                          </div>
                          <span className="text-[12px] text-[#6B7280]">
                            {player.places} {player.places === 1 ? 'место' : 'мест'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* LOBBY: Buy plates panel */}
            {isLobbyPhase && !hasJoined && freeSeats > 0 && (
              <div className="rounded-[16px] border border-[#FF008A]/20 bg-[#1A1B22]/90 p-4 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-[#F2F3F5]">Купить тарелки</p>
                  <span className="text-[11px] text-[#6B7280]">
                    Макс. {maxPlacesToBuy} (50%)
                  </span>
                </div>

                <div className="mb-3 flex items-center justify-between rounded-[10px] bg-white/5 px-3 py-2">
                  <span className="text-[12px] text-[#9CA3AF]">Выбрано тарелок</span>
                  <span className="text-[20px] font-black text-white">{selectedSeats.size}</span>
                </div>

                <div className="mb-3 rounded-[10px] bg-white/5 px-3 py-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#6B7280]">Цена за тарелку</span>
                    <span className="text-[#F2F3F5]">{entryCost.toLocaleString('ru-RU')} STL</span>
                  </div>
                  <div className="mt-1 flex justify-between text-[14px] font-bold">
                    <span className="text-[#6B7280]">Итого</span>
                    <span className="text-[#FFD700]">{totalCost.toLocaleString('ru-RU')} STL</span>
                  </div>
                </div>

                {seatError && (
                  <p className="mb-2 rounded-[8px] bg-red-500/10 px-3 py-2 text-[12px] text-red-400">{seatError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-[12px] bg-[#FF008A] px-4 py-3 text-[14px] font-bold text-white shadow-[0_0_20px_rgba(255,0,138,0.3)] transition hover:bg-[#E0007A] hover:shadow-[0_0_28px_rgba(255,0,138,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isBuyingSeats || selectedSeats.size === 0}
                    onClick={() => { void handleBuySeats() }}
                    type="button"
                  >
                    {isBuyingSeats ? 'Покупаем...' : `Занять (${selectedSeats.size})`}
                  </button>
                  {selectedSeats.size > 0 && (
                    <button
                      className="rounded-[12px] border border-white/10 bg-white/5 px-3 text-[12px] text-[#9CA3AF] transition hover:bg-white/10"
                      onClick={clearSelection}
                      type="button"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-[#6B7280]">
                  Кликайте по свободным тарелкам, чтобы выбрать места для ставки.
                </p>
              </div>
            )}

            {/* LOBBY: Joined status */}
            {isLobbyPhase && hasJoined && (
              <div className="rounded-[16px] border border-[#22C55E]/20 bg-[#22C55E]/5 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[#22C55E]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[13px] font-semibold text-[#22C55E]">
                    Вы заняли {myPlaces} {myPlaces === 1 ? 'тарелку' : 'тарелок'}
                  </p>
                </div>
                <p className="mt-1 text-[12px] text-[#6B7280]">Ожидаем начала игры...</p>
              </div>
            )}

            {/* LOBBY: All seats taken */}
            {isLobbyPhase && freeSeats === 0 && !hasJoined && (
              <div className="rounded-[16px] border border-yellow-500/20 bg-yellow-500/5 p-4">
                <p className="text-[13px] font-semibold text-yellow-400">Все тарелки заняты</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">Скоро начнётся игра</p>
              </div>
            )}

            {/* BOOST: Buy boost panel — only for joined players */}
            {isBoostPhase && hasJoined && !hasPurchasedBoost && (
              <div className="rounded-[16px] border border-[#A78BFA]/20 bg-[#1A1B22]/90 p-4 backdrop-blur-sm">
                <p className="mb-3 text-[13px] font-semibold text-[#F2F3F5]">⚡ Купить буст</p>

                {/* Mode toggle */}
                <div className="mb-3 flex rounded-[8px] overflow-hidden border border-white/10">
                  <button
                    className={`flex-1 py-1.5 text-[11px] font-semibold transition ${boostMode === 'amount' ? 'bg-[#7C3AED] text-white' : 'bg-white/5 text-[#6B7280] hover:text-white'}`}
                    onClick={() => setBoostMode('amount')}
                    type="button"
                  >
                    По сумме
                  </button>
                  <button
                    className={`flex-1 py-1.5 text-[11px] font-semibold transition ${boostMode === 'probability' ? 'bg-[#7C3AED] text-white' : 'bg-white/5 text-[#6B7280] hover:text-white'}`}
                    onClick={() => setBoostMode('probability')}
                    type="button"
                  >
                    По вероятности
                  </button>
                </div>

                {boostMode === 'amount' ? (
                  <div className="mb-3">
                    <label className="mb-1 block text-[11px] text-[#6B7280]">Сумма буста (STL)</label>
                    <input
                      className="w-full rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[14px] text-white placeholder-[#4B5563] outline-none focus:border-[#A78BFA]/50"
                      min={1}
                      onChange={(e) => setBoostAmount(e.target.value)}
                      placeholder="Введите сумму..."
                      type="number"
                      value={boostAmount}
                    />
                    {boostCalcProbLoading && (
                      <p className="mt-1 text-[11px] text-[#6B7280]">Вычисляем шанс...</p>
                    )}
                    {!boostCalcProbLoading && boostPreviewProbability !== null && (
                      <p className="mt-1 text-[11px] text-[#A78BFA]">
                        → Шанс с бустом: <strong>{boostPreviewProbability.toFixed(1)}%</strong>
                        {myProbability !== null && (
                          <span className="ml-1 text-[#22C55E]">(+{Math.max(0, boostPreviewProbability - myProbability).toFixed(1)}%)</span>
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mb-3">
                    <label className="mb-1 block text-[11px] text-[#6B7280]">Желаемый шанс победы (%)</label>
                    <input
                      className="w-full rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[14px] text-white placeholder-[#4B5563] outline-none focus:border-[#A78BFA]/50"
                      max={99}
                      min={1}
                      onChange={(e) => setBoostProbInput(e.target.value)}
                      placeholder="Например, 50"
                      type="number"
                      value={boostProbInput}
                    />
                    {boostCalcAmountLoading && (
                      <p className="mt-1 text-[11px] text-[#6B7280]">Вычисляем сумму...</p>
                    )}
                    {!boostCalcAmountLoading && boostRequiredAmount !== null && (
                      <p className="mt-1 text-[11px] text-[#A78BFA]">
                        → Нужно буста: <strong>{Math.ceil(boostRequiredAmount).toLocaleString('ru-RU')} STL</strong>
                      </p>
                    )}
                  </div>
                )}

                {boostError && (
                  <p className="mb-2 rounded-[7px] bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-400">{boostError}</p>
                )}

                <button
                  className="w-full rounded-[10px] bg-[#7C3AED] py-2.5 text-[13px] font-bold text-white shadow-[0_0_16px_rgba(124,58,237,0.3)] transition hover:bg-[#6D28D9] hover:shadow-[0_0_24px_rgba(124,58,237,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={buyBoostMutation.isPending}
                  onClick={() => buyBoostMutation.mutate()}
                  type="button"
                >
                  {buyBoostMutation.isPending ? 'Покупка...' : 'Применить буст'}
                </button>
              </div>
            )}

            {/* BOOST: confirmed */}
            {isBoostPhase && hasJoined && hasPurchasedBoost && (
              <div className="rounded-[16px] border border-[#22C55E]/20 bg-[#22C55E]/5 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[#22C55E]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[13px] font-semibold text-[#22C55E]">Буст активирован!</p>
                </div>
                <p className="mt-1 text-[12px] text-[#6B7280]">Ваши шансы на победу увеличены.</p>
              </div>
            )}

            {/* BOOST: spectator notice (didn't join in time) */}
            {isBoostPhase && !hasJoined && (
              <div className="rounded-[16px] border border-white/10 bg-white/5 p-4">
                <p className="text-[13px] font-semibold text-[#F2F3F5]">Вы наблюдаете</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">
                  Игра уже идёт, ставки сделаны. Дождитесь следующей комнаты.
                </p>
              </div>
            )}

            {lobbyError && (
              <p className="rounded-[10px] bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{lobbyError}</p>
            )}

            <button
              className="mt-auto flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#B24B4B]/50 bg-[#5A2323]/40 text-[13px] font-bold text-[#FF9999] transition hover:bg-[#6D2B2B]/60 disabled:opacity-50"
              disabled={isLeavingRoom}
              onClick={() => {
                if (hasJoined && isLobbyPhase) {
                  setShowExitConfirm(true)
                } else {
                  void handleLeaveRoomAndExit(onBackToGames)
                }
              }}
              type="button"
            >
              {isLeavingRoom ? 'Выходим...' : '← Покинуть комнату'}
            </button>
          </div>
        </div>

        {/* RESULTS overlay */}
        {phase === 'results' && (
          <ResultsOverlay
            isWinner={isWinner}
            winnerUserId={winner?.user_id ?? null}
            prize={winner?.prize ?? 0}
            onPlayAgain={onPlayAgain}
            onBackToGames={onBackToGames}
          />
        )}

        {/* Exit confirmation modal */}
        {showExitConfirm && (
          <ExitConfirmModal
            isLeaving={isLeavingRoom}
            onCancel={() => setShowExitConfirm(false)}
            onConfirm={() => {
              setShowExitConfirm(false)
              void handleLeaveRoomAndExit(onBackToGames)
            }}
          />
        )}
      </section>
    </main>
  )
}

function LegendDot({ color, label, outline = false }: { color: string; label: string; outline?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-sm"
        style={{
          background: outline ? 'transparent' : color,
          border: `1.5px solid ${color}`,
          boxShadow: outline ? `0 0 6px ${color}` : 'none',
        }}
      />
      {label}
    </span>
  )
}

function ResultsOverlay({
  isWinner,
  winnerUserId,
  prize,
  onPlayAgain,
  onBackToGames,
}: {
  isWinner: boolean
  winnerUserId: number | null
  prize: number
  onPlayAgain: () => void
  onBackToGames: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
      {isWinner && <Confetti />}
      <div
        className="relative w-full max-w-[460px] overflow-hidden rounded-[24px] border p-8 text-center shadow-2xl"
        style={{
          background: isWinner
            ? 'linear-gradient(135deg, #1a2a0a 0%, #0f1a06 100%)'
            : 'linear-gradient(135deg, #1a1020 0%, #0f0818 100%)',
          borderColor: isWinner ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)',
          boxShadow: isWinner
            ? '0 0 60px rgba(255,215,0,0.15), inset 0 0 60px rgba(0,0,0,0.5)'
            : '0 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {isWinner ? (
          <>
            <div className="mb-4 text-[60px] leading-none">🏆</div>
            <h2 className="mb-2 text-[32px] font-black text-[#FFD700]" style={{ textShadow: '0 0 30px rgba(255,215,0,0.5)' }}>
              ВЫ ПОБЕДИЛИ!
            </h2>
            <p className="mb-5 text-[15px] text-[#9CA3AF]">Поздравляем с победой!</p>
            <div className="mb-6 rounded-[16px] border border-[#FFD700]/20 bg-[#FFD700]/10 px-6 py-4">
              <p className="text-[11px] uppercase tracking-widest text-[#9CA3AF]">Ваш приз</p>
              <p className="mt-1 text-[36px] font-black text-[#FFD700]">
                {prize.toLocaleString('ru-RU')} STL
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 text-[60px] leading-none">😔</div>
            <h2 className="mb-2 text-[28px] font-black text-[#F2F3F5]">В этот раз не повезло</h2>
            <p className="mb-5 text-[14px] text-[#6B7280]">Удача улыбнулась другому</p>
            {winnerUserId !== null && (
              <div className="mb-6 rounded-[16px] border border-white/10 bg-white/5 px-6 py-4">
                <p className="text-[11px] uppercase tracking-widest text-[#6B7280]">Победитель</p>
                <p className="mt-1 text-[18px] font-bold text-[#F2F3F5]">Игрок {winnerUserId}</p>
                <p className="text-[14px] text-[#FFD700]">{prize.toLocaleString('ru-RU')} STL</p>
              </div>
            )}
          </>
        )}

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-[12px] bg-[#FF008A] py-3.5 text-[15px] font-bold text-white shadow-[0_0_20px_rgba(255,0,138,0.3)] transition hover:bg-[#E0007A]"
            onClick={onPlayAgain}
            type="button"
          >
            Играть снова
          </button>
          <button
            className="flex-1 rounded-[12px] border border-white/10 bg-white/5 py-3.5 text-[15px] font-bold text-[#9CA3AF] transition hover:bg-white/10"
            onClick={onBackToGames}
            type="button"
          >
            Все комнаты
          </button>
        </div>
      </div>
    </div>
  )
}

function ExitConfirmModal({
  isLeaving,
  onCancel,
  onConfirm,
}: {
  isLeaving: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="w-[min(92vw,400px)] overflow-hidden rounded-[20px] border border-white/10 bg-[#1A1B22] p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5A2323]/40">
            <svg className="h-5 w-5 text-[#FF9999]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 9v3m0 3h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[16px] font-bold text-white">Покинуть лобби?</h3>
        </div>
        <p className="mb-6 text-[13px] leading-relaxed text-[#9CA3AF]">
          Ваши занятые тарелки освободятся, а потраченные баллы вернутся на баланс.
        </p>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-[10px] border border-white/10 bg-white/5 py-2.5 text-[13px] font-semibold text-[#D1D5DB] transition hover:bg-white/10"
            onClick={onCancel}
            type="button"
            disabled={isLeaving}
          >
            Остаться
          </button>
          <button
            className="flex-1 rounded-[10px] bg-[#5A2323] py-2.5 text-[13px] font-bold text-[#FF9999] transition hover:bg-[#6D2B2B] disabled:opacity-50"
            onClick={onConfirm}
            type="button"
            disabled={isLeaving}
          >
            {isLeaving ? 'Выходим...' : 'Покинуть'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Confetti() {
  const COLORS = ['#FFD700', '#FF008A', '#22C55E', '#A78BFA', '#60A5FA', '#F59E0B']
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: COLORS[i % COLORS.length],
    left: `${(i * 1.7) % 100}%`,
    animDuration: `${2.5 + (i % 5) * 0.5}s`,
    animDelay: `${(i % 8) * 0.25}s`,
    size: `${6 + (i % 5)}px`,
    shape: i % 3,
  }))

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            top: -20,
            left: p.left,
            width: p.shape === 2 ? `${parseInt(p.size) * 2}px` : p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 0 ? '50%' : '2px',
            animation: `confettiFall ${p.animDuration} ${p.animDelay} ease-in forwards`,
            pointerEvents: 'none',
            zIndex: 60,
          }}
        />
      ))}
    </>
  )
}
