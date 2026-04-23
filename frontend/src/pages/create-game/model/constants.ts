import type { GameBackground } from './types'

export type BackgroundOption = {
  value: GameBackground
  label: string
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { value: 'altai', label: 'Алтай' },
  { value: 'space', label: 'Космос' },
  { value: 'japan', label: 'Япония' },
]

export const FILTER_COST_OPTIONS = [
  { value: '', label: 'Любая начальная стоимость' },
  { value: '500', label: 'до 500' },
  { value: '1000', label: 'до 1 000' },
  { value: '5000', label: 'до 5 000' },
] as const

export const FILTER_PLAYERS_OPTIONS = [
  { value: '', label: 'Любое число игроков' },
  { value: '5', label: '5 игроков' },
  { value: '10', label: '10 игроков' },
  { value: '20', label: '20 игроков' },
] as const
