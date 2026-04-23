import type { CSSProperties } from 'react'
import { ASSETS } from '../model/constants'

export type PlateMode = 'closed' | 'open'

export type PlateStateColor = 'free' | 'mine' | 'taken' | 'selected' | 'winner' | 'neutral'

type PlateProps = {
  seatNumber: number
  mode: PlateMode
  state: PlateStateColor
  productSrc?: string
  productLabel?: string
  showProduct?: boolean
  showLabel?: boolean
  probability?: number | null
  isClickable?: boolean
  onClick?: () => void
  revealDelayMs?: number
}

const STATE_RING: Record<PlateStateColor, { ring: string; glow: string; chipBg: string; chipText: string }> = {
  free: {
    ring: 'rgba(255, 0, 138, 0.55)',
    glow: '0 0 0 0 rgba(255,0,138,0)',
    chipBg: 'rgba(255, 0, 138, 0.85)',
    chipText: '#fff',
  },
  selected: {
    ring: 'rgba(255, 0, 138, 1)',
    glow: '0 0 22px rgba(255,0,138,0.65), 0 0 0 3px rgba(255,0,138,0.35)',
    chipBg: 'rgba(255, 0, 138, 1)',
    chipText: '#fff',
  },
  mine: {
    ring: 'rgba(34, 197, 94, 0.95)',
    glow: '0 0 22px rgba(34,197,94,0.55), 0 0 0 3px rgba(34,197,94,0.35)',
    chipBg: 'rgba(34, 197, 94, 0.95)',
    chipText: '#04220e',
  },
  taken: {
    ring: 'rgba(255, 255, 255, 0.25)',
    glow: 'none',
    chipBg: 'rgba(255, 255, 255, 0.25)',
    chipText: '#0E0F14',
  },
  winner: {
    ring: 'rgba(255, 215, 0, 1)',
    glow: '0 0 36px rgba(255,215,0,0.75), 0 0 0 3px rgba(255,215,0,0.55)',
    chipBg: 'rgba(255, 215, 0, 1)',
    chipText: '#2a1d00',
  },
  neutral: {
    ring: 'rgba(255, 255, 255, 0.18)',
    glow: 'none',
    chipBg: 'rgba(255, 255, 255, 0.85)',
    chipText: '#0E0F14',
  },
}

export function Plate({
  seatNumber,
  mode,
  state,
  productSrc,
  productLabel,
  showProduct = false,
  showLabel = true,
  probability = null,
  isClickable = false,
  onClick,
  revealDelayMs = 0,
}: PlateProps) {
  const ring = STATE_RING[state]
  const isOpen = mode === 'open'

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: 18,
    cursor: isClickable ? 'pointer' : 'default',
    transition: 'transform 180ms ease, box-shadow 220ms ease',
    transform: state === 'selected' ? 'translateY(-4px) scale(1.02)' : 'none',
    boxShadow: ring.glow,
    outline: 'none',
    background: 'transparent',
  }

  return (
    <button
      aria-label={`Тарелка ${seatNumber}`}
      onClick={isClickable ? onClick : undefined}
      style={containerStyle}
      type="button"
      disabled={!isClickable}
    >
      {/* Soft halo behind plate to anchor it visually on the dark bg */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: '12% 6% 6% 6%',
          background: `radial-gradient(ellipse at 50% 65%, ${ring.ring} 0%, rgba(0,0,0,0) 65%)`,
          borderRadius: '50%',
          filter: 'blur(2px)',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />

      {/* Closed plate (cover sitting on the plate) */}
      <img
        alt=""
        aria-hidden
        draggable={false}
        src={ASSETS.plateClosed}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: isOpen ? 0 : 1,
          transition: 'opacity 700ms ease',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* Product (revealed under the cover once it lifts) */}
      {productSrc && (
        <img
          alt={productLabel ?? ''}
          draggable={false}
          src={productSrc}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '14%',
            transform: showProduct ? 'translate(-50%, 0) scale(1)' : 'translate(-50%, 30%) scale(0.4)',
            width: '46%',
            maxHeight: '40%',
            objectFit: 'contain',
            opacity: showProduct ? 1 : 0,
            transition: `opacity 500ms ease ${revealDelayMs + 350}ms, transform 600ms cubic-bezier(.2,.9,.3,1.4) ${revealDelayMs + 350}ms`,
            filter:
              state === 'winner'
                ? 'drop-shadow(0 0 12px rgba(255,215,0,0.95))'
                : state === 'mine'
                ? 'drop-shadow(0 0 8px rgba(34,197,94,0.6))'
                : 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      )}

      {/* Open plate (cover floating above) - shown after reveal */}
      <img
        alt=""
        aria-hidden
        draggable={false}
        src={ASSETS.plateOpen}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(8%)',
          transition: `opacity 700ms ease ${revealDelayMs}ms, transform 700ms cubic-bezier(.2,.9,.3,1.4) ${revealDelayMs}ms`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* Number / probability chip */}
      {showLabel && (
        <span
          style={{
            position: 'absolute',
            top: '6%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: ring.chipBg,
            color: ring.chipText,
            fontSize: 12,
            fontWeight: 800,
            padding: '2px 9px',
            borderRadius: 999,
            lineHeight: 1.2,
            letterSpacing: 0.4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          #{seatNumber}
          {probability !== null && probability !== undefined && (
            <span style={{ marginLeft: 5, opacity: 0.85 }}>
              · {probability.toFixed(0)}%
            </span>
          )}
        </span>
      )}
    </button>
  )
}
