export type RoomConfiguratorState = {
  seatsTotal: number
  entryCost: number
  prizeFundPercent: number
  boostPrice: number
}

export type RoomConfiguratorAnalysis = {
  attractivenessScore: number
  organizerScore: number
  warnings: string[]
  errors: string[]
  canSave: boolean
}

export const initialRoomConfiguratorState: RoomConfiguratorState = {
  seatsTotal: 10,
  entryCost: 3000,
  prizeFundPercent: 82,
  boostPrice: 600,
}

export function analyzeRoomConfigurator(state: RoomConfiguratorState): RoomConfiguratorAnalysis {
  const warnings: string[] = []
  const errors: string[] = []

  if (state.seatsTotal < 2 || state.seatsTotal > 30) {
    errors.push('Количество мест должно быть от 2 до 30.')
  }
  if (state.entryCost < 100 || state.entryCost > 200000) {
    errors.push('Цена входа должна быть в диапазоне от 100 до 200 000.')
  }
  if (state.prizeFundPercent < 50 || state.prizeFundPercent > 95) {
    errors.push('Доля призового фонда победителю должна быть от 50% до 95%.')
  }
  if (state.boostPrice < 100) {
    errors.push('Стоимость буста не может быть ниже 100.')
  }

  if (state.prizeFundPercent > 88) {
    warnings.push('Очень высокий процент фонда победителю снижает выгоду организатора.')
  }
  if (state.boostPrice > state.entryCost * 0.5) {
    warnings.push('Буст дороже 50% входа, это может снизить конверсию в покупку.')
  }
  if (state.entryCost > 15000) {
    warnings.push('Высокая цена входа может уменьшить скорость заполнения комнаты.')
  }
  if (state.seatsTotal >= 20 && state.entryCost >= 10000) {
    warnings.push('Большая комната и высокая цена входа одновременно повышают риск неполного набора.')
  }

  const attractivenessScore = Math.max(
    0,
    Math.min(
      100,
      95 -
        (state.entryCost > 10000 ? 15 : 0) -
        (state.boostPrice > state.entryCost * 0.5 ? 20 : 0) -
        (state.seatsTotal > 16 ? 10 : 0),
    ),
  )

  const organizerScore = Math.max(0, Math.min(100, 100 - state.prizeFundPercent + (state.boostPrice >= 500 ? 10 : 0)))

  return {
    attractivenessScore,
    organizerScore,
    warnings,
    errors,
    canSave: errors.length === 0,
  }
}
