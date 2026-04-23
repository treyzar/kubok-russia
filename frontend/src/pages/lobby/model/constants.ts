import { type ProductItem } from './types'

export const ASSETS = {
  bg: '/dev-assets/images/game_background.jpg',
  plateClosed: '/dev-assets/images/plate_closed.png',
  plateOpen: '/dev-assets/images/plate_open.png',
  introVideo: '/dev-assets/videos/intro.mp4',
} as const

export const CHROMA_KEY_THRESHOLD = 1.3
export const CHROMA_KEY_GREEN_MIN = 80

/**
 * Placeholder product icons revealed under each plate cover. To be replaced
 * with real merchandise / food items later — for now we just show whatever
 * is visually expressive enough to make the reveal feel rewarding.
 */
export const PRODUCTS: ProductItem[] = [
  { id: 'caviar', src: '/dev-assets/images/caviar.svg', label: 'Икра' },
  { id: 'cheese', src: '/dev-assets/images/cheese.svg', label: 'Сыр' },
  { id: 'icecream', src: '/dev-assets/images/icecream.svg', label: 'Мороженое' },
  { id: 'sausage', src: '/dev-assets/images/sausage.svg', label: 'Колбаса' },
  { id: 'vino', src: '/dev-assets/images/vino.svg', label: 'Вино' },
]

/**
 * Deterministic shuffle so every client renders the same product on the same
 * seat for a given room id (no server round-trip required).
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed || 1
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Maximum places a single player may purchase: 50% of the total seats in the
 * room (rounded down), but never more than the currently free seats.
 */
export function maxBuyablePlaces(totalSeats: number, freeSeats: number): number {
  const halfCap = Math.max(1, Math.floor(totalSeats / 2))
  return Math.max(0, Math.min(halfCap, freeSeats))
}
