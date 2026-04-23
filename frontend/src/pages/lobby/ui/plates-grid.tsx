import { Plate, type PlateStateColor } from './plate'
import type { GamePhase, PlayerWithProbability, RevealSeatInfo } from '../model/types'

type PlatesGridProps = {
  seats: RevealSeatInfo[]
  phase: GamePhase
  selectedSeats: Set<number>
  apiUserId: number | null
  hasJoined: boolean
  isMyTurnToSelect: boolean
  onSeatClick: (seatNumber: number) => void
  playersWithProbabilities: PlayerWithProbability[]
}

const PROB_BY_USER = (
  players: PlayerWithProbability[],
): Map<number, number> => new Map(players.map((p) => [p.userId, p.probability]))

export function PlatesGrid({
  seats,
  phase,
  selectedSeats,
  apiUserId,
  hasJoined,
  isMyTurnToSelect,
  onSeatClick,
  playersWithProbabilities,
}: PlatesGridProps) {
  if (seats.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-[13px] text-[#6B7280]">Загрузка тарелок...</p>
      </div>
    )
  }

  const cols = Math.min(6, Math.max(2, Math.ceil(Math.sqrt(seats.length))))
  const probByUser = PROB_BY_USER(playersWithProbabilities)
  const isOpenMode = phase === 'reveal' || phase === 'results'

  return (
    <div
      className="grid w-full"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 'clamp(8px, 1.4vw, 18px)',
        padding: 'clamp(4px, 0.8vw, 12px)',
      }}
    >
      {seats.map((seat, idx) => {
        const isSelected = selectedSeats.has(seat.seatNumber)
        const isFree = seat.userId === null

        const state: PlateStateColor = (() => {
          if (isOpenMode) {
            if (seat.isWinner) return 'winner'
            if (seat.userId === apiUserId) return 'mine'
            if (seat.userId !== null) return 'taken'
            return 'neutral'
          }
          if (isSelected) return 'selected'
          if (seat.userId === apiUserId) return 'mine'
          if (seat.userId !== null) return 'taken'
          return 'free'
        })()

        let probability: number | null = null
        if (phase === 'boost' && seat.userId !== null) {
          probability = probByUser.get(seat.userId) ?? null
        }

        const isClickable =
          phase === 'lobby' && !hasJoined && isMyTurnToSelect && isFree

        const showProduct = isOpenMode && seat.userId !== null
        const revealDelay = isOpenMode ? Math.min(idx * 100, 1500) : 0

        return (
          <Plate
            key={seat.seatNumber}
            seatNumber={seat.seatNumber}
            mode={isOpenMode ? 'open' : 'closed'}
            state={state}
            productSrc={seat.productSrc}
            productLabel={seat.productLabel}
            showProduct={showProduct}
            showLabel={!isOpenMode || seat.userId !== null}
            probability={probability}
            isClickable={isClickable}
            onClick={() => onSeatClick(seat.seatNumber)}
            revealDelayMs={revealDelay}
          />
        )
      })}
    </div>
  )
}
