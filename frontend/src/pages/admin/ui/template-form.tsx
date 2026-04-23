import { type FormEvent, useState } from 'react'

import { type AdminTemplateListItem, type AdminTemplatePayload } from '@shared/api'
import { Button } from '@shared/ui'

import {
  DEFAULT_TEMPLATE_FORM,
  type TemplateFormValues,
  templateToFormValues,
  useTemplateValidation,
} from '../lib/use-template-form'

type TemplateFormProps = {
  initialTemplate?: AdminTemplateListItem
  submitLabel: string
  onCancel: () => void
  onSubmit: (payload: AdminTemplatePayload) => Promise<void>
}

const NUMERIC_INPUT_CLASS =
  'h-10 w-full rounded-md border border-[#3A3B45] bg-[#15161C] px-3 text-[15px] text-[#F2F3F5] outline-none focus:border-[#A8E45E]'

export function TemplateForm({ initialTemplate, submitLabel, onCancel, onSubmit }: TemplateFormProps) {
  const [values, setValues] = useState<TemplateFormValues>(
    initialTemplate ? templateToFormValues(initialTemplate) : DEFAULT_TEMPLATE_FORM,
  )
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { validation, isLoading, jackpot } = useTemplateValidation(values)

  function patch<K extends keyof TemplateFormValues>(key: K, value: TemplateFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function patchInt(key: 'min_players' | 'max_players' | 'entry_cost' | 'winner_pct', raw: string) {
    const n = Number(raw)
    patch(key, Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0)
  }

  const isDuplicate = validation?.is_duplicate ?? false
  // For edit, an unchanged template would falsely trip the duplicate check —
  // suppress that case.
  const duplicateBlocks =
    isDuplicate &&
    !(initialTemplate &&
      initialTemplate.min_players === values.min_players &&
      initialTemplate.max_players === values.max_players &&
      initialTemplate.entry_cost === values.entry_cost &&
      initialTemplate.winner_pct === values.winner_pct)

  const submitDisabled =
    submitting ||
    duplicateBlocks ||
    values.min_players < 1 ||
    values.max_players < 1 ||
    values.min_players > values.max_players ||
    values.winner_pct < 1 ||
    values.winner_pct > 99

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        min_players: values.min_players,
        max_players: values.max_players,
        entry_cost: values.entry_cost,
        winner_pct: values.winner_pct,
        game_type: values.game_type,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось сохранить шаблон')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Тип игры">
          <select
            className={NUMERIC_INPUT_CLASS}
            value={values.game_type}
            onChange={(e) => patch('game_type', e.target.value as TemplateFormValues['game_type'])}
          >
            <option value="fridge">Ночной жор</option>
          </select>
        </Field>

        <Field label="Минимум игроков">
          <input
            className={NUMERIC_INPUT_CLASS}
            type="number"
            min={1}
            value={values.min_players}
            onChange={(e) => patchInt('min_players', e.target.value)}
          />
        </Field>

        <Field label="Максимум игроков">
          <input
            className={NUMERIC_INPUT_CLASS}
            type="number"
            min={1}
            value={values.max_players}
            onChange={(e) => patchInt('max_players', e.target.value)}
          />
        </Field>

        <Field label="Стартовый взнос">
          <input
            className={NUMERIC_INPUT_CLASS}
            type="number"
            min={0}
            value={values.entry_cost}
            onChange={(e) => patchInt('entry_cost', e.target.value)}
          />
        </Field>

        <Field label="Процент куша (%)">
          <input
            className={NUMERIC_INPUT_CLASS}
            type="number"
            min={1}
            max={99}
            value={values.winner_pct}
            onChange={(e) => patchInt('winner_pct', e.target.value)}
          />
        </Field>

        <Field label="Сумма джекпота">
          <div className="flex h-10 items-center justify-between rounded-md border border-[#3A3B45] bg-[#15161C] px-3 text-[15px] text-[#A8E45E]">
            <span className="font-semibold">{jackpot.toLocaleString('ru-RU')}</span>
            {isLoading ? <span className="text-xs text-[#9098A8]">обновление…</span> : null}
          </div>
        </Field>
      </div>

      {/* Validation hints */}
      <div className="space-y-1.5">
        {duplicateBlocks ? (
          <p className="rounded-md border border-[#FF4D4D]/50 bg-[#3A1A1A] px-3 py-2 text-[13px] text-[#FFB4B4]">
            Шаблон с такими параметрами уже существует — создание заблокировано.
          </p>
        ) : null}
        {(validation?.warnings ?? [])
          .filter((w) => w.severity === 'warning')
          .map((w, i) => (
            <p
              key={`${w.field}-${i}`}
              className="rounded-md border border-[#E0AB3A]/50 bg-[#3A2C12] px-3 py-2 text-[13px] text-[#F4D58A]"
            >
              {translateWarning(w.field, w.message)}
            </p>
          ))}
      </div>

      {submitError ? (
        <p className="rounded-md border border-[#FF4D4D]/50 bg-[#3A1A1A] px-3 py-2 text-[13px] text-[#FFB4B4]">
          {submitError}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Отмена
        </Button>
        <Button
          type="submit"
          className="bg-[#A8E45E] text-[#101114] hover:bg-[#B9ED76] disabled:opacity-60"
          disabled={submitDisabled}
        >
          {submitting ? 'Сохранение…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-wide text-[#9098A8]">{label}</span>
      {children}
    </label>
  )
}

/** Map server-side English warnings to ТЗ-style Russian phrasing. */
function translateWarning(field: string, fallback: string): string {
  switch (field) {
    case 'players_needed':
      if (fallback.includes('twice')) {
        return 'Максимум игроков превышает удвоенное среднее число реальных игроков за неделю — слишком высокая планка.'
      }
      return 'Слишком маленькое максимальное число игроков (1).'
    case 'min_players':
      return 'Минимум игроков превышает среднее число реальных игроков за неделю — слишком высокая планка.'
    case 'entry_cost':
      if (fallback.includes('high')) {
        return 'Стартовый взнос слишком большой (более 1.75× от среднего за неделю).'
      }
      return 'Стартовый взнос слишком маленький (менее 0.5× от среднего за неделю).'
    case 'winner_pct':
      if (fallback.includes('high')) {
        return 'Слишком большой процент куша (>80%) — на джекпот уходит почти всё.'
      }
      return 'Слишком маленький процент куша (<50%) — джекпот будет небольшим.'
    default:
      return fallback
  }
}
