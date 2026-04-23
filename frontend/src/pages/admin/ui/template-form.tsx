import { type FormEvent, useState } from 'react'
import { AlertTriangle, Coins, Gamepad2, Hash, Percent, Trophy, Users } from 'lucide-react'

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

const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-[#E2E5EA] bg-white px-3.5 text-[15px] font-semibold text-[#111] outline-none transition-colors placeholder:text-[#B0B5BD] focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFE680]'

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

  const winnerPrize = Math.round((jackpot * values.winner_pct) / 100)

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Live preview band: jackpot + winner prize */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#FFE08A] bg-gradient-to-br from-[#FFF7CF] via-[#FFEEA8] to-[#FFE680] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(255,196,0,0.35)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A5A00]">
            <Coins className="size-3.5" />
            Джекпот при полной комнате
            {isLoading ? <span className="ml-auto text-[10px] font-semibold text-[#A07700]">обновление…</span> : null}
          </div>
          <p className="mt-1 text-[28px] font-black leading-none text-[#1A1100] tabular-nums">
            {jackpot.toLocaleString('ru-RU')} <span className="text-[15px] font-bold text-[#7A5A00]">STL</span>
          </p>
        </div>
        <div className="rounded-2xl border border-[#E6F8EE] bg-gradient-to-br from-[#E6F8EE] to-[#C8F0D7] px-5 py-4 shadow-[inset_0_0_0_1px_rgba(26,183,90,0.25)]">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0F7A3A]">
            <Trophy className="size-3.5" />
            Приз победителю
          </div>
          <p className="mt-1 text-[28px] font-black leading-none text-[#0B4F26] tabular-nums">
            {winnerPrize.toLocaleString('ru-RU')} <span className="text-[15px] font-bold text-[#0F7A3A]">STL</span>
          </p>
          <p className="mt-1 text-[11.5px] text-[#0F7A3A]">
            {values.winner_pct}% от джекпота
          </p>
        </div>
      </div>

      {/* Section: основные параметры */}
      <div>
        <SectionHeader title="Основные параметры" subtitle="Тип игры и количество мест в комнате." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field icon={Gamepad2} label="Тип игры">
            <select
              className={INPUT_CLASS}
              value={values.game_type}
              onChange={(e) => patch('game_type', e.target.value as TemplateFormValues['game_type'])}
            >
              <option value="fridge">Ночной жор</option>
            </select>
          </Field>
          <Field icon={Hash} label="Стартовый взнос (STL)">
            <input
              className={INPUT_CLASS}
              type="number"
              min={0}
              value={values.entry_cost}
              onChange={(e) => patchInt('entry_cost', e.target.value)}
            />
          </Field>
          <Field icon={Users} label="Минимум игроков">
            <input
              className={INPUT_CLASS}
              type="number"
              min={1}
              value={values.min_players}
              onChange={(e) => patchInt('min_players', e.target.value)}
            />
          </Field>
          <Field icon={Users} label="Максимум игроков">
            <input
              className={INPUT_CLASS}
              type="number"
              min={1}
              value={values.max_players}
              onChange={(e) => patchInt('max_players', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Section: распределение */}
      <div>
        <SectionHeader title="Распределение фонда" subtitle="Какая доля джекпота уходит победителю." />
        <Field icon={Percent} label="Процент куша победителю (%)">
          <input
            className={INPUT_CLASS}
            type="number"
            min={1}
            max={99}
            value={values.winner_pct}
            onChange={(e) => patchInt('winner_pct', e.target.value)}
          />
        </Field>
      </div>

      {/* Validation hints */}
      {(duplicateBlocks || (validation?.warnings ?? []).length > 0) ? (
        <div className="space-y-2">
          {duplicateBlocks ? (
            <Notice tone="error">
              Шаблон с такими параметрами уже существует — создание заблокировано.
            </Notice>
          ) : null}
          {(validation?.warnings ?? [])
            .filter((w) => w.severity === 'warning')
            .map((w, i) => (
              <Notice key={`${w.field}-${i}`} tone="warning">
                {translateWarning(w.field, w.message)}
              </Notice>
            ))}
        </div>
      ) : null}

      {submitError ? <Notice tone="error">{submitError}</Notice> : null}

      <div className="flex items-center justify-end gap-2 border-t border-[#F2F3F5] pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className="border-[#E2E5EA] bg-white text-[#7B7B7B] hover:bg-[#FAFBFC] hover:text-[#111]"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          className="h-10 gap-2 rounded-full bg-[#FFD400] px-5 text-[13.5px] font-bold text-[#111] shadow-[0_8px_20px_rgba(255,212,0,0.35)] hover:bg-[#FFE040] disabled:opacity-50 disabled:shadow-none"
          disabled={submitDisabled}
        >
          {submitting ? 'Сохранение…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[13px] font-black uppercase tracking-wider text-[#111]">{title}</h3>
      {subtitle ? <p className="text-[12px] text-[#7B7B7B]">{subtitle}</p> : null}
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#7B7B7B]">
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </span>
      {children}
    </label>
  )
}

function Notice({ tone, children }: { tone: 'error' | 'warning'; children: React.ReactNode }) {
  const palette =
    tone === 'error'
      ? 'border-[#FFD0D0] bg-[#FFEDED] text-[#9A1F1F]'
      : 'border-[#FFE08A] bg-[#FFF7CF] text-[#7A5A00]'
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${palette}`}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
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
