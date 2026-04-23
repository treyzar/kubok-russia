import type { Player } from './types'

export const ASSETS = {
  bg: '/dev-assets/images/game_background.jpg',
  fridge: '/dev-assets/images/logo-fridge.png',
  mascot: '/dev-assets/images/mascot_1.svg',
  introVideo: '/dev-assets/videos/intro.mp4',
} as const

export const INITIAL_BANK = 5_000_000
export const INITIAL_WIN_CHANCE = 20
export const BONUS_BANK_DELTA = 100_000
export const BONUS_WIN_CHANCE_DELTA = 10
export const COUNTDOWN_SECONDS = 30
export const FINISH_COUNTDOWN_SECONDS = 5
export const CHROMA_KEY_THRESHOLD = 1.3
export const CHROMA_KEY_GREEN_MIN = 80
export const FRIDGE_CELLS_COUNT = 10

export const PLAYERS: Player[] = [
  { id: 1, name: 'Александр Ли', amount: 2_100_000 },
  { id: 2, name: 'Андрей Леонов', amount: 1_700_000 },
  { id: 3, name: 'Денис Колодцев', amount: 400_000 },
  { id: 4, name: 'Олег Долгов', amount: 220_000 },
  { id: 5, name: 'Дмитрий Никифоров', amount: 100_000 },
  { id: 6, name: 'Вы', amount: 100_000, isUser: true },
]
