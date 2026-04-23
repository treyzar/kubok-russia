import { useEffect, useMemo, useState } from 'react'

import {
  type AdminTemplateListItem,
  type ValidateTemplateResponse,
  validateAdminTemplate,
} from '@shared/api'

export type TemplateFormValues = {
  min_players: number
  max_players: number
  entry_cost: number
  winner_pct: number
  game_type: 'fridge'
}

export const DEFAULT_TEMPLATE_FORM: TemplateFormValues = {
  min_players: 2,
  max_players: 10,
  entry_cost: 500,
  winner_pct: 80,
  game_type: 'fridge',
}

export function templateToFormValues(t: AdminTemplateListItem): TemplateFormValues {
  return {
    min_players: t.min_players,
    max_players: t.max_players,
    entry_cost: t.entry_cost,
    winner_pct: t.winner_pct,
    game_type: 'fridge',
  }
}

/**
 * Live jackpot is recalculated locally so the user sees instant feedback.
 * The server-side validation endpoint returns the canonical value too — we
 * use that as the source of truth once warnings come back.
 */
export function calcJackpot(values: TemplateFormValues): number {
  return Math.floor((values.max_players * values.entry_cost * values.winner_pct) / 100)
}

export function useTemplateValidation(values: TemplateFormValues) {
  const [result, setResult] = useState<ValidateTemplateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce + cancel-on-rerun guard.
  useEffect(() => {
    const aborted = { current: false }
    const id = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await validateAdminTemplate({
          players_needed: values.max_players,
          min_players: values.min_players,
          entry_cost: values.entry_cost,
          winner_pct: values.winner_pct,
          game_type: values.game_type,
        })
        if (!aborted.current) setResult(res)
      } catch (err) {
        if (!aborted.current) {
          setError(err instanceof Error ? err.message : 'Не удалось получить подсказки')
          setResult(null)
        }
      } finally {
        if (!aborted.current) setLoading(false)
      }
    }, 300)

    return () => {
      aborted.current = true
      window.clearTimeout(id)
    }
  }, [values.min_players, values.max_players, values.entry_cost, values.winner_pct, values.game_type])

  const localJackpot = useMemo(() => calcJackpot(values), [values])
  return {
    validation: result,
    isLoading: loading,
    error,
    jackpot: result?.expected_jackpot ?? localJackpot,
  }
}
