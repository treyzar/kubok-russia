import { useFridgeGame, type UseFridgeGameOptions } from '../lib'
import { ChromaKeyVideo } from './chroma-key-video'
import { ASSETS } from '../model/constants'
import type { ProductItem } from '../model/types'

type FridgeGamePageProps = UseFridgeGameOptions

export function FridgeGamePage(props: FridgeGamePageProps) {
  const game = useFridgeGame(props)
  const { phase } = game

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0E0F14] text-[#F2F3F5]">
      <img
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-30"
        draggable={false}
        src={ASSETS.bg}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0E0F14]/70 via-transparent to-[#0E0F14]/90" />

      <div className="relative z-10 flex h-full flex-col">
        {phase === 'boost' && <BoostPhase game={game} />}
        {phase === 'video' && <VideoPhase onEnded={game.handleVideoEnded} />}
        {(phase === 'reveal' || phase === 'results') && <RevealPhase game={game} />}
        {phase === 'results' && <ResultsOverlay game={game} />}
      </div>
    </div>
  )
}

function BoostPhase({ game }: { game: ReturnType<typeof useFridgeGame> }) {
  const {
    room,
    boostSecondsLeft,
    playersWithProbabilities,
    myProbability,
    hasPurchasedBoost,
    boostAmount,
    setBoostAmount,
    desiredProbability,
    setDesiredProbability,
    boostProbabilityPreview,
    requiredBoostAmount,
    buyBoostMutation,
    boostError,
    seatAssignments,
    apiUserId,
    userName,
  } = game

  const jackpot = room?.jackpot ?? 0
  const totalSeats = room?.players_needed ?? 0

  const timerPct = boostSecondsLeft !== null && room?.round_duration_seconds
    ? (boostSecondsLeft / room.round_duration_seconds) * 100
    : 100

  const timerColor = timerPct > 50 ? '#22C55E' : timerPct > 25 ? '#F59E0B' : '#EF4444'

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#FF008A]" />
          <span className="text-[14px] font-semibold uppercase tracking-widest text-[#FF008A]">Покупка бустов</span>
        </div>
        {boostSecondsLeft !== null && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-[120px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5" style={{ borderColor: `${timerColor}40`, backgroundColor: `${timerColor}15` }}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" style={{ color: timerColor }}>
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              <span className="text-[16px] font-black tabular-nums" style={{ color: timerColor }}>
                {String(Math.floor((boostSecondsLeft ?? 0) / 60)).padStart(2, '0')}:{String((boostSecondsLeft ?? 0) % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative w-full max-w-[320px]">
            <img
              alt="Холодильник"
              className="w-full select-none"
              draggable={false}
              src={ASSETS.fridge}
            />
            <div
              className="absolute"
              style={{
                inset: '12% 18% 8% 18%',
                display: 'grid',
                gridTemplateColumns: totalSeats <= 6 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
                gap: '5px',
                padding: '4px',
              }}
            >
              {seatAssignments.map((seat) => {
                const isMe = seat.userId === apiUserId
                const player = seat.userId !== null
                  ? game.playersWithProbabilities.find((p) => p.userId === seat.userId)
                  : null

                let bg = 'rgba(255, 0, 138, 0.10)'
                let border = 'rgba(255, 0, 138, 0.3)'
                let color = 'rgba(255,255,255,0.5)'

                if (isMe) {
                  bg = 'rgba(34, 197, 94, 0.2)'
                  border = 'rgba(34, 197, 94, 0.7)'
                  color = '#22C55E'
                } else if (seat.userId !== null) {
                  bg = 'rgba(255, 255, 255, 0.05)'
                  border = 'rgba(255, 255, 255, 0.15)'
                  color = 'rgba(255,255,255,0.35)'
                }

                return (
                  <div
                    key={seat.seatNumber}
                    style={{
                      background: bg,
                      border: `1.5px solid ${border}`,
                      borderRadius: 7,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color,
                      backdropFilter: 'blur(4px)',
                      minHeight: 30,
                      padding: '2px',
                    }}
                  >
                    <span style={{ fontSize: 11 }}>{seat.seatNumber}</span>
                    {player && (
                      <span style={{ fontSize: 9, opacity: 0.8 }}>{player.probability.toFixed(0)}%</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex w-[300px] flex-col gap-3 xl:w-[360px]">
          <div className="rounded-[14px] border border-white/5 bg-[#1A1B22]/90 p-4 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-[#6B7280]">Общий банк</p>
            <p className="mt-0.5 text-[26px] font-black leading-none text-[#FFD700]">
              {jackpot.toLocaleString('ru-RU')}
              <span className="ml-1.5 text-[13px] font-medium text-[#9CA3AF]">STL</span>
            </p>
            {myProbability !== null && (
              <div className="mt-2 flex items-center gap-2 rounded-[8px] bg-white/5 px-3 py-2">
                <span className="text-[12px] text-[#9CA3AF]">Твой шанс:</span>
                <span className="ml-auto text-[16px] font-bold text-[#A78BFA]">{myProbability.toFixed(1)}%</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden rounded-[14px] border border-white/5 bg-[#1A1B22]/90 backdrop-blur-sm">
            <div className="border-b border-white/5 px-4 py-2.5">
              <p className="text-[12px] font-semibold text-[#F2F3F5]">Игроки & вероятности</p>
            </div>
            <div className="max-h-[200px] overflow-y-auto p-3">
              <ul className="space-y-1.5">
                {[...game.playersWithProbabilities]
                  .sort((a, b) => b.probability - a.probability)
                  .map((player, idx) => {
                    const barWidth = Math.min(100, player.probability)
                    return (
                      <li
                        key={player.userId}
                        className={`relative overflow-hidden rounded-[8px] px-3 py-2 ${player.isMe ? 'border border-[#A78BFA]/30 bg-[#A78BFA]/10' : 'bg-white/3'}`}
                      >
                        <div className="relative z-10 flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${idx === 0 ? 'text-[#FFD700]' : 'text-[#6B7280]'}`}>
                            {idx === 0 ? '🏆' : `#${idx + 1}`}
                          </span>
                          <span className="flex-1 text-[12px] font-medium text-[#D1D5DB] truncate">
                            {player.isMe ? (apiUserId !== null ? '← Вы' : 'Вы') : `Игрок ${player.userId}`}
                          </span>
                          {player.boostAmount > 0 && (
                            <span className="text-[10px] text-[#22C55E]">🚀</span>
                          )}
                          <span className={`text-[13px] font-bold ${player.isMe ? 'text-[#A78BFA]' : 'text-[#F2F3F5]'}`}>
                            {player.probability.toFixed(1)}%
                          </span>
                        </div>
                        <div
                          className="absolute bottom-0 left-0 h-0.5 rounded-full bg-current opacity-30 transition-all duration-700"
                          style={{ width: `${barWidth}%`, color: player.isMe ? '#A78BFA' : '#6B7280' }}
                        />
                      </li>
                    )
                  })}
              </ul>
            </div>
          </div>

          {!hasPurchasedBoost && (
            <div className="rounded-[14px] border border-[#A78BFA]/20 bg-[#1A1B22]/90 p-4 backdrop-blur-sm">
              <p className="mb-3 text-[12px] font-semibold text-[#F2F3F5]">Купить буст</p>

              <div className="mb-2 space-y-2">
                <div>
                  <label className="mb-1 block text-[11px] text-[#6B7280]">Сумма буста (STL)</label>
                  <input
                    className="w-full rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[14px] text-white placeholder-[#4B5563] outline-none focus:border-[#A78BFA]/50"
                    min={1}
                    onChange={(e) => setBoostAmount(e.target.value)}
                    placeholder="Введите сумму..."
                    type="number"
                    value={boostAmount}
                  />
                  {boostProbabilityPreview !== null && (
                    <p className="mt-1 text-[11px] text-[#A78BFA]">→ Шанс победы: {boostProbabilityPreview.toFixed(1)}%</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] text-[#6B7280]">Или укажи желаемый шанс (%)</label>
                  <input
                    className="w-full rounded-[8px] border border-white/10 bg-white/5 px-3 py-2 text-[14px] text-white placeholder-[#4B5563] outline-none focus:border-[#22C55E]/50"
                    max={99}
                    min={1}
                    onChange={(e) => setDesiredProbability(e.target.value)}
                    placeholder="Напр. 30"
                    type="number"
                    value={desiredProbability}
                  />
                  {requiredBoostAmount !== null && (
                    <p className="mt-1 text-[11px] text-[#22C55E]">→ Нужно потратить: {requiredBoostAmount.toLocaleString('ru-RU')} STL</p>
                  )}
                </div>
              </div>

              {boostError && (
                <p className="mb-2 rounded-[7px] bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-400">{boostError}</p>
              )}

              <button
                className="w-full rounded-[10px] bg-[#7C3AED] py-2.5 text-[13px] font-bold text-white shadow-[0_0_16px_rgba(124,58,237,0.3)] transition hover:bg-[#6D28D9] hover:shadow-[0_0_24px_rgba(124,58,237,0.5)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={buyBoostMutation.isPending}
                onClick={() => { void buyBoostMutation.mutate() }}
                type="button"
              >
                {buyBoostMutation.isPending ? 'Покупка...' : '⚡ Купить буст'}
              </button>
            </div>
          )}

          {hasPurchasedBoost && (
            <div className="rounded-[14px] border border-[#22C55E]/20 bg-[#22C55E]/5 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[#22C55E]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-[13px] font-semibold text-[#22C55E]">Буст активирован!</p>
              </div>
              <p className="mt-1 text-[12px] text-[#6B7280]">Ваши шансы на победу увеличены.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function VideoPhase({ onEnded }: { onEnded: () => void }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-black">
      <div className="w-full max-w-[960px]">
        <ChromaKeyVideo onEnded={onEnded} src={ASSETS.introVideo} />
      </div>
    </div>
  )
}

function RevealPhase({ game }: { game: ReturnType<typeof useFridgeGame> }) {
  const { seatAssignments, seatProducts, room } = game
  const totalSeats = room?.players_needed ?? 0

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="relative w-full max-w-[400px]">
        <img
          alt="Холодильник открыт"
          className="w-full select-none drop-shadow-[0_0_60px_rgba(255,200,0,0.2)]"
          draggable={false}
          src={ASSETS.fridge}
        />

        <div
          className="absolute"
          style={{
            inset: '12% 18% 8% 18%',
            display: 'grid',
            gridTemplateColumns: totalSeats <= 6 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
            gap: '6px',
            padding: '4px',
          }}
        >
          {seatAssignments.map((seat, idx) => {
            const product: ProductItem = seatProducts[idx] ?? seatProducts[0]
            const isWinnerSeat = seat.isWinner

            return (
              <div
                key={seat.seatNumber}
                className="reveal-seat flex flex-col items-center justify-center rounded-[8px] p-1"
                style={{
                  background: isWinnerSeat ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0,0,0,0.4)',
                  border: `2px solid ${isWinnerSeat ? 'rgba(255,215,0,0.8)' : 'rgba(255,255,255,0.1)'}`,
                  boxShadow: isWinnerSeat ? '0 0 20px rgba(255,215,0,0.4)' : 'none',
                  animationDelay: `${idx * 0.12}s`,
                  opacity: 0,
                  animation: 'revealSeat 0.4s ease forwards',
                  minHeight: 36,
                }}
              >
                <img
                  alt={product.label}
                  className="w-full select-none"
                  draggable={false}
                  src={product.src}
                  style={{
                    filter: isWinnerSeat ? 'drop-shadow(0 0 8px rgba(255,215,0,0.8))' : seat.userId === null ? 'grayscale(0.8) opacity(0.4)' : 'none',
                    maxHeight: 28,
                    objectFit: 'contain',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes revealSeat {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

function ResultsOverlay({ game }: { game: ReturnType<typeof useFridgeGame> }) {
  const { isWinner, winner, apiUserId, onPlayAgain, onBackToGames } = game
  const prize = winner?.prize ?? 0

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
      {isWinner && <Confetti />}

      <div
        className="relative w-full max-w-[480px] overflow-hidden rounded-[24px] border p-8 text-center shadow-2xl"
        style={{
          background: isWinner
            ? 'linear-gradient(135deg, #1a2a0a 0%, #0f1a06 100%)'
            : 'linear-gradient(135deg, #1a0a1a 0%, #0f060f 100%)',
          borderColor: isWinner ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)',
          boxShadow: isWinner
            ? '0 0 60px rgba(255,215,0,0.15), inset 0 0 60px rgba(0,0,0,0.5)'
            : '0 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {isWinner ? (
          <>
            <div className="mb-4 text-[64px] leading-none">🏆</div>
            <h2 className="mb-2 text-[36px] font-black text-[#FFD700]" style={{ textShadow: '0 0 30px rgba(255,215,0,0.5)' }}>
              ВЫ ПОБЕДИЛИ!
            </h2>
            <p className="mb-6 text-[16px] text-[#9CA3AF]">Поздравляем с победой!</p>
            <div className="mb-6 rounded-[16px] border border-[#FFD700]/20 bg-[#FFD700]/10 px-6 py-4">
              <p className="text-[13px] uppercase tracking-widest text-[#9CA3AF]">Ваш приз</p>
              <p className="mt-1 text-[40px] font-black text-[#FFD700]">
                {prize.toLocaleString('ru-RU')} STL
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 text-[64px] leading-none">😔</div>
            <h2 className="mb-2 text-[32px] font-black text-[#F2F3F5]">В этот раз не повезло</h2>
            <p className="mb-6 text-[15px] text-[#6B7280]">
              Удача улыбнулась другому игроку
            </p>
            {winner && (
              <div className="mb-6 rounded-[16px] border border-white/10 bg-white/5 px-6 py-4">
                <p className="text-[13px] uppercase tracking-widest text-[#6B7280]">Победитель</p>
                <p className="mt-1 text-[20px] font-bold text-[#F2F3F5]">Игрок {winner.user_id}</p>
                <p className="text-[15px] text-[#FFD700]">{prize.toLocaleString('ru-RU')} STL</p>
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
            На главную
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
    left: `${Math.random() * 100}%`,
    animDuration: `${2 + Math.random() * 3}s`,
    animDelay: `${Math.random() * 2}s`,
    size: `${6 + Math.random() * 8}px`,
    shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'square' : 'rect',
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
            width: p.shape === 'rect' ? `${parseInt(p.size) * 2}px` : p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            animation: `confettiFall ${p.animDuration} ${p.animDelay} ease-in forwards`,
            pointerEvents: 'none',
            zIndex: 60,
          }}
        />
      ))}
    </>
  )
}
