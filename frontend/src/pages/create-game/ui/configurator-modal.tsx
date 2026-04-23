import { Button, Input } from '@shared/ui'
import { ConfigField } from './config-field'
import { type ConfiguratorModalProps } from '../model'
import { ApiClientError } from '@shared/api'

function mapSaveTemplateError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 409) return 'Шаблон с таким именем уже существует'
    if (error.status === 400) return error.message || 'Некорректные данные шаблона'
  }
  return 'Не удалось сохранить шаблон. Попробуйте ещё раз.'
}

export function ConfiguratorModal({
  draft,
  analysis,
  onFieldChange,
  onSave,
  onClose,
  templateName,
  setTemplateName,
  saveTemplateMutation,
  applyTemplate,
  templates,
  templateSaveSuccess,
}: ConfiguratorModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm">
      <div className="mx-auto max-h-full w-full max-w-[880px] overflow-y-auto rounded-[20px] border border-[#4B2F67] bg-[#1A1C25] p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[28px] font-bold text-[#ADE562]">Конфигуратор комнаты</h2>
          <Button
            className="rounded-[9px] border border-[#50576A] bg-[#202532] px-3 hover:bg-[#252B3B]"
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Закрыть
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ConfigField
            label="Количество мест"
            onChange={(v) => onFieldChange('seatsTotal', v)}
            value={String(draft.seatsTotal)}
          />
          <ConfigField
            label="Цена входа"
            onChange={(v) => onFieldChange('entryCost', v)}
            value={String(draft.entryCost)}
          />
          <ConfigField
            label="Фонд победителю (%)"
            onChange={(v) => onFieldChange('prizeFundPercent', v)}
            value={String(draft.prizeFundPercent)}
          />
          <ConfigField
            label="Стоимость буста"
            onChange={(v) => onFieldChange('boostPrice', v)}
            value={String(draft.boostPrice)}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-[12px] border border-[#325744] bg-[#1C2B23] px-3 py-2">
            <p className="text-sm text-[#9DD9B5]">Привлекательность для игрока</p>
            <p className="text-2xl font-bold text-[#CCF6DE]">{analysis.attractivenessScore}%</p>
          </div>
          <div className="rounded-[12px] border border-[#4D4A2A] bg-[#2B2919] px-3 py-2">
            <p className="text-sm text-[#D9D296]">Выгода для организатора</p>
            <p className="text-2xl font-bold text-[#F7EEB3]">{analysis.organizerScore}%</p>
          </div>
        </div>

        {analysis.warnings.length > 0 ? (
          <div className="mt-4 rounded-[12px] border border-[#786C34] bg-[#332D18] px-3 py-3">
            <p className="text-sm font-semibold text-[#F1E3A3]">Предупреждения</p>
            <ul className="mt-2 space-y-1 text-sm text-[#F5EEC8]">
              {analysis.warnings.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {analysis.errors.length > 0 ? (
          <div className="mt-4 rounded-[12px] border border-[#8A3C3C] bg-[#3A1E1E] px-3 py-3">
            <p className="text-sm font-semibold text-[#FFB8B8]">Невалидная конфигурация</p>
            <ul className="mt-2 space-y-1 text-sm text-[#FFD1D1]">
              {analysis.errors.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            className="rounded-[10px] bg-[#6B22F5] px-5 text-white hover:bg-[#7D38FF]"
            disabled={!analysis.canSave}
            onClick={onSave}
            type="button"
          >
            Сохранить конфигурацию
          </Button>
        </div>

        <div className="mt-6 border-t border-[#2F3442] pt-5">
          <p className="text-[16px] font-semibold text-[#ADE562]">Сохранить как шаблон</p>
          <div className="mt-3 flex items-center gap-2">
            <Input
              className="h-[42px] rounded-[10px] border-[#363B4A] bg-[#17181D] text-[15px] text-[#ECEEF4] placeholder:text-[#6B7280] focus-visible:border-[#555C6D]"
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Название шаблона"
              value={templateName}
            />
            <Button
              className="h-[42px] shrink-0 rounded-[10px] bg-[#3A5C2A] px-4 text-[14px] font-semibold text-[#CFF3B8] hover:bg-[#4A7035] disabled:opacity-50"
              disabled={!analysis.canSave || !templateName || saveTemplateMutation.isPending}
              onClick={() => saveTemplateMutation.mutate()}
              type="button"
            >
              {saveTemplateMutation.isPending ? 'Сохранение...' : 'Сохранить как шаблон'}
            </Button>
          </div>

          {saveTemplateMutation.isError ? (
            <p className="mt-2 text-[13px] text-[#FFB8B8]">{mapSaveTemplateError(saveTemplateMutation.error)}</p>
          ) : null}

          {templateSaveSuccess && !saveTemplateMutation.isError ? (
            <p className="mt-2 text-[13px] text-[#9DD9B5]">Шаблон успешно сохранён</p>
          ) : null}
        </div>

        {templates.length > 0 ? (
          <div className="mt-5">
            <p className="text-[15px] font-semibold text-[#A1A7B5]">Существующие шаблоны</p>
            <ul className="mt-2 space-y-2">
              {templates.map((tpl) => (
                <li
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[#2F3442] bg-[#202532] px-3 py-2"
                  key={tpl.template_id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-[#ECEEF4]">{tpl.name}</p>
                    <p className="text-[12px] text-[#6B7280]">
                      {tpl.players_needed} игроков · {tpl.entry_cost} · {tpl.winner_pct}%
                    </p>
                  </div>
                  <Button
                    className="h-[32px] shrink-0 rounded-[8px] border border-[#4B5563] bg-[#2D3748] px-3 text-[13px] text-[#D1D5DB] hover:bg-[#374151]"
                    onClick={() => applyTemplate(tpl)}
                    type="button"
                    variant="outline"
                  >
                    Применить
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
