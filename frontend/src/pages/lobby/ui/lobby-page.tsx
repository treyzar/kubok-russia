import { useBodyScrollLock } from '@shared/lib'
import { AppHeader } from '@widgets/header'

import { useLobby } from '../lib'
import type { LobbyPageProps, SeatInfo } from '../model'

export function LobbyPage({
  roomId,
  onBackToGames,
  onPlayAgain,
  onStartGame,
  onLogout,
  onUserBalanceChange,
  user,
}: LobbyPageProps) {
  useBodyScrollLock()

  const {
    room,
    roomStatus,
    seats,
    players,
    boostsCount,
    hasJoined,
    myPlaces,
    isLoadingLobby,
    lobbyError,
    isLeavingRoom,
    countdownLabel,
    handleBuySeats,
    handleLeaveRoomAndExit,
    isBuyingSeats,
    seatError,
    placesToBuy,
    setPlacesToBuy,
    maxPlacesToBuy,
    freeSeats,
    totalSeats,
    apiUserId,
  } = useLobby({ roomId, onStartGame, userId: user.id, userName: user.name, userBalance: user.balance, onUserBalanceChange })

  const jackpot = room?.jackpot ?? 0
  const entryCost = room?.entry_cost ?? 0
  const playersJoined = players.reduce((sum, p) => sum + p.places, 0)
  const totalCost = entryCost * placesToBuy

  const statusLabel: Record<string, string> = {
    new: 'Набор игроков',
    starting_soon: 'Скоро начнётся',
    playing: 'Игра идёт',
    finished: 'Завершено',
  }

  const dotClass = {
    new: 'animate-pulse bg-yellow-400',
    starting_soon: 'animate-pulse bg-orange-400',
    playing: 'bg-green-400',
    finished: 'bg-gray-400',
  }[roomStatus] ?? 'bg-gray-400'

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#0E0F14] text-[#F2F3F5]">
      <AppHeader onBrandClick={onBackToGames} onLogout={onLogout} user={user} />

      <section className="relative flex flex-1 flex-col overflow-hidden">
        <img
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center opacity-40"
          draggable={false}
          src="/dev-assets/images/game_background.jpg"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0E0F14]/60 via-transparent to-[#0E0F14]/80" />

        <div className="relative z-10 flex flex-1 flex-col gap-4 overflow-auto p-4 md:flex-row md:p-6">

          {/* Left: fridge */}
          <div className="flex flex-col gap-4 md:flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[13px] font-medium text-[#C8CDD8]">
                  <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
                  {statusLabel[roomStatus] ?? roomStatus}
                </span>
                <span className="text-[13px] text-[#6B7280]">Комната #{roomId}</span>
              </div>

              {countdownLabel && roomStatus === 'starting_soon' && (
                <div className="flex items-center gap-2 rounded-[10px] border border-orange-400/30 bg-orange-400/10 px-4 py-2">
                  <svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                  <span className="text-[15px] font-bold text-orange-300">До начала: {countdownLabel}</span>
                </div>
              )}
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[20px] border border-white/5 bg-black/20 backdrop-blur-sm">
              <div className="flex h-full flex-col items-center justify-center p-4">
                <p className="mb-4 text-[14px] font-medium uppercase tracking-widest text-[#6B7280]">Места в игре</p>

                {isLoadingLobby && totalSeats === 0 ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF008A] border-t-transparent" />
                    <p className="text-[13px] text-[#6B7280]">Загружаем комнату...</p>
                  </div>
                ) : (
                  <FridgeWithSeats seats={seats} totalSeats={totalSeats} />
                )}

                <div className="mt-4 flex items-center gap-4 text-[13px] text-[#9CA3AF]">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(255,0,138,0.7)', border: '1px solid rgba(255,0,138,0.9)' }} />
                    Свободно
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(34,197,94,0.7)', border: '1px solid rgba(34,197,94,0.9)' }} />
                    Ваши
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)' }} />
                    Занято
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: info panel */}
          <div className="flex w-full flex-col gap-4 md:w-[320px] xl:w-[360px]">

            {/* Bank */}
            <div className="rounded-[16px] border border-white/5 bg-[#1A1B22]/90 p-5 backdrop-blur-sm">
              <p className="mb-1 text-[11px] uppercase tracking-widest text-[#6B7280]">Банк комнаты</p>
              <p className="text-[32px] font-black leading-none text-[#FFD700]">
                {jackpot.toLocaleString('ru-RU')}
                <span className="ml-2 text-[16px] font-medium text-[#9CA3AF]">STL</span>
              </p>
              <div className="mt-3 flex items-center justify-between text-[13px] text-[#9CA3AF]">
                <span>Вход: <strong className="text-[#F2F3F5]">{entryCost.toLocaleString('ru-RU')} STL</strong></span>
                <span>Бустов: <strong className="text-[#F2F3F5]">{boostsCount}</strong></span>
              </div>
            </div>

            {/* Players */}
            <div className="flex-1 overflow-hidden rounded-[16px] border border-white/5 bg-[#1A1B22]/90 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <p className="text-[13px] font-semibold text-[#F2F3F5]">Игроки</p>
                <span className="text-[13px] text-[#6B7280]">{playersJoined} / {room?.players_needed ?? '?'} мест</span>
              </div>
              <div className="max-h-[200px] overflow-y-auto px-4 py-3">
                {isLoadingLobby && players.length === 0 ? (
                  <p className="text-[13px] text-[#6B7280]">Загрузка...</p>
                ) : players.length === 0 ? (
                  <p className="text-[13px] text-[#6B7280]">Пока никого нет. Будьте первым!</p>
                ) : (
                  <ul className="space-y-2">
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
                            {player.places} {player.places === 1 ? 'место' : 'места'}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Buy seats */}
            {!hasJoined && (roomStatus === 'new' || roomStatus === 'starting_soon') && freeSeats > 0 && (
              <div className="rounded-[16px] border border-[#FF008A]/20 bg-[#1A1B22]/90 p-5 backdrop-blur-sm">
                <p className="mb-3 text-[13px] font-semibold text-[#F2F3F5]">Купить места</p>

                <div className="mb-4 flex items-center gap-3">
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/10 bg-white/5 text-[18px] font-bold text-white transition hover:bg-white/10 disabled:opacity-40"
                    disabled={placesToBuy <= 1}
                    onClick={() => setPlacesToBuy(Math.max(1, placesToBuy - 1))}
                    type="button"
                  >
                    −
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-[24px] font-black text-white">{placesToBuy}</span>
                    <span className="ml-1 text-[13px] text-[#6B7280]">{placesToBuy === 1 ? 'место' : 'места'}</span>
                  </div>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/10 bg-white/5 text-[18px] font-bold text-white transition hover:bg-white/10 disabled:opacity-40"
                    disabled={placesToBuy >= maxPlacesToBuy}
                    onClick={() => setPlacesToBuy(Math.min(maxPlacesToBuy, placesToBuy + 1))}
                    type="button"
                  >
                    +
                  </button>
                </div>

                <div className="mb-3 rounded-[10px] bg-white/5 px-3 py-2">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[#6B7280]">Цена за место</span>
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

                <button
                  className="w-full rounded-[12px] bg-[#FF008A] px-4 py-3 text-[15px] font-bold text-white shadow-[0_0_20px_rgba(255,0,138,0.3)] transition hover:bg-[#E0007A] hover:shadow-[0_0_28px_rgba(255,0,138,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isBuyingSeats || maxPlacesToBuy === 0}
                  onClick={() => { void handleBuySeats() }}
                  type="button"
                >
                  {isBuyingSeats ? 'Покупаем...' : `Занять ${placesToBuy === 1 ? 'место' : 'места'}`}
                </button>
              </div>
            )}

            {/* Joined status */}
            {hasJoined && (roomStatus === 'new' || roomStatus === 'starting_soon') && (
              <div className="rounded-[16px] border border-[#22C55E]/20 bg-[#22C55E]/5 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-[#22C55E]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-[13px] font-semibold text-[#22C55E]">
                    Вы заняли {myPlaces} {myPlaces === 1 ? 'место' : 'места'}
                  </p>
                </div>
                <p className="mt-1 text-[12px] text-[#6B7280]">Ожидаем начала игры...</p>
              </div>
            )}

            {/* All seats taken */}
            {freeSeats === 0 && !hasJoined && roomStatus !== 'playing' && roomStatus !== 'finished' && totalSeats > 0 && (
              <div className="rounded-[16px] border border-yellow-500/20 bg-yellow-500/5 p-4">
                <p className="text-[13px] font-semibold text-yellow-400">Все места заняты</p>
                <p className="mt-1 text-[12px] text-[#6B7280]">Скоро начнётся игра</p>
              </div>
            )}

            {lobbyError && (
              <p className="rounded-[10px] bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{lobbyError}</p>
            )}

            <button
              className="mt-auto flex h-11 items-center justify-center gap-2 rounded-[12px] border border-[#B24B4B]/50 bg-[#5A2323]/40 text-[14px] font-bold text-[#FF9999] transition hover:bg-[#6D2B2B]/60 disabled:opacity-50"
              disabled={isLeavingRoom}
              onClick={() => {
                const confirmMsg = hasJoined
                  ? 'Покинуть лобби? Ваши занятые места освободятся.'
                  : 'Покинуть лобби?'
                if (window.confirm(confirmMsg)) {
                  void handleLeaveRoomAndExit(onBackToGames)
                }
              }}
              type="button"
            >
              {isLeavingRoom ? 'Выходим...' : '← Покинуть лобби'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

function FridgeWithSeats({ seats, totalSeats }: { seats: SeatInfo[]; totalSeats: number }) {
  const cols = totalSeats <= 6 ? 2 : 3

  return (
    <div className="relative w-full max-w-[340px]">
      {/* Fridge image */}
      <img
        alt="Холодильник"
        className="w-full select-none"
        draggable={false}
        src="/dev-assets/big_fridge.svg"
        style={{ display: 'block' }}
      />

      {/* Seat plates overlay — calibrated to the fridge door area */}
      {seats.length > 0 && (
        <div
          className="absolute"
          style={{
            top: '13%',
            left: '15%',
            right: '15%',
            bottom: '5%',
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: '6px',
            padding: '6px',
          }}
        >
          {seats.map((seat) => (
            <SeatPlate key={seat.seatNumber} seat={seat} />
          ))}
        </div>
      )}

      {/* Loading skeleton if no seats yet */}
      {seats.length === 0 && totalSeats === 0 && (
        <div
          className="absolute"
          style={{ top: '13%', left: '15%', right: '15%', bottom: '5%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="rounded-[10px] border border-white/10 bg-black/40 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-[12px] text-[#6B7280]">Загрузка...</p>
          </div>
        </div>
      )}
    </div>
  )
}

function SeatPlate({ seat }: { seat: SeatInfo }) {
  let bg: string
  let border: string
  let textColor: string
  let glow = ''

  if (seat.isMe) {
    bg = 'rgba(34, 197, 94, 0.45)'
    border = 'rgba(34, 197, 94, 0.95)'
    textColor = '#86EFAC'
    glow = '0 0 8px rgba(34,197,94,0.4)'
  } else if (seat.userId !== null) {
    bg = 'rgba(255, 255, 255, 0.12)'
    border = 'rgba(255, 255, 255, 0.30)'
    textColor = 'rgba(255, 255, 255, 0.55)'
  } else {
    bg = 'rgba(255, 0, 138, 0.30)'
    border = 'rgba(255, 0, 138, 0.75)'
    textColor = 'rgba(255, 200, 230, 0.95)'
  }

  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 800,
        color: textColor,
        backdropFilter: 'blur(6px)',
        boxShadow: glow || 'none',
        minHeight: 28,
        userSelect: 'none',
      }}
    >
      {seat.seatNumber}
    </div>
  )
}
