import type { ProductItem } from './types'

export const ASSETS = {
  bg: '/dev-assets/images/game_background.jpg',
  fridge: '/dev-assets/big_fridge.svg',
  introVideo: '/dev-assets/videos/intro.mp4',
} as const

export const CHROMA_KEY_THRESHOLD = 1.3
export const CHROMA_KEY_GREEN_MIN = 80

export const PRODUCTS: ProductItem[] = [
  { id: 'caviar', src: '/dev-assets/images/caviar.svg', label: 'Икра' },
  { id: 'cheese', src: '/dev-assets/images/cheese.svg', label: 'Сыр' },
  { id: 'icecream', src: '/dev-assets/images/icecream.svg', label: 'Мороженое' },
  { id: 'sausage', src: '/dev-assets/images/sausage.svg', label: 'Колбаса' },
  { id: 'vino', src: '/dev-assets/images/vino.svg', label: 'Вино' },
]

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    const j = Math.abs(s) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
