import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  type AdminTemplateListItem,
  type AdminTemplatePayload,
  createAdminTemplate,
  deleteAdminTemplate,
  listAdminTemplates,
  updateAdminTemplate,
} from '@shared/api'
import { Button } from '@shared/ui'

import { TemplateForm } from './template-form'

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; template: AdminTemplateListItem }

function gameTypeLabel(t: string): string {
  if (t === 'fridge') return 'Ночной жор'
  return t
}

export function TemplatesTab() {
  const qc = useQueryClient()
  const [mode, setMode] = useState<Mode>({ kind: 'list' })

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'templates', 'list'],
    queryFn: () => listAdminTemplates({ period: 'all' }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: AdminTemplatePayload) => createAdminTemplate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'templates'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AdminTemplatePayload }) =>
      updateAdminTemplate(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'templates'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'templates'] }),
  })

  if (mode.kind === 'create') {
    return (
      <FormCard title="Новый шаблон">
        <TemplateForm
          submitLabel="Создать шаблон"
          onCancel={() => setMode({ kind: 'list' })}
          onSubmit={async (payload) => {
            await createMutation.mutateAsync(payload)
            setMode({ kind: 'list' })
          }}
        />
      </FormCard>
    )
  }

  if (mode.kind === 'edit') {
    return (
      <FormCard title={`Редактирование шаблона #${mode.template.template_id}`}>
        <TemplateForm
          initialTemplate={mode.template}
          submitLabel="Сохранить"
          onCancel={() => setMode({ kind: 'list' })}
          onSubmit={async (payload) => {
            await updateMutation.mutateAsync({ id: mode.template.template_id, payload })
            setMode({ kind: 'list' })
          }}
        />
      </FormCard>
    )
  }

  const templates = data?.templates ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_2px_12px_rgba(16,24,40,0.06)] backdrop-blur">
        <div className="inline-flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#F1E8FF]">
            <Layers className="size-5 text-[#4F1FB3]" />
          </span>
          <div>
            <h2 className="text-[16px] font-black text-[#111]">Шаблоны комнат</h2>
            <p className="text-[12px] text-[#7B7B7B]">Параметры, по которым автоматически создаются комнаты.</p>
          </div>
        </div>
        <Button
          className="h-10 gap-2 rounded-full bg-[#FFD400] px-4 text-[13.5px] font-bold text-[#111] shadow-[0_8px_20px_rgba(255,212,0,0.35)] hover:bg-[#FFE040]"
          onClick={() => setMode({ kind: 'create' })}
        >
          <Plus className="size-4" />
          Создать шаблон
        </Button>
      </div>

      {isLoading ? <p className="text-[13px] text-[#9A9A9A]">Загрузка…</p> : null}
      {error ? <p className="text-[13px] text-[#C42929]">Не удалось загрузить шаблоны.</p> : null}

      <div className="rounded-2xl border border-[#ECECEC] bg-white shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13.5px]">
            <thead className="bg-[#FAFBFC] text-[#7B7B7B]">
              <tr>
                <Th>ID</Th>
                <Th>Название</Th>
                <Th>Тип</Th>
                <Th>Min/Max</Th>
                <Th>Взнос</Th>
                <Th>%</Th>
                <Th>Сыграно</Th>
                <Th>Статус</Th>
                <Th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.template_id} className="border-t border-[#F2F3F5] text-[#111] transition-colors hover:bg-[#FFFBE5]">
                  <Td><span className="font-bold text-[#7B7B7B]">#{t.template_id}</span></Td>
                  <Td className="font-semibold">{t.name?.trim() ? t.name : <span className="text-[#9A9A9A]">—</span>}</Td>
                  <Td>{gameTypeLabel(t.game_type)}</Td>
                  <Td>{t.min_players}/{t.max_players}</Td>
                  <Td>{t.entry_cost.toLocaleString('ru-RU')} STL</Td>
                  <Td>{t.winner_pct}%</Td>
                  <Td><span className="font-bold">{t.completed_rooms}</span></Td>
                  <Td>
                    {t.deleted_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEDED] px-2.5 py-0.5 text-[11px] font-bold text-[#C42929]">
                        <span className="size-1.5 rounded-full bg-[#C42929]" />
                        Удалён
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F8EE] px-2.5 py-0.5 text-[11px] font-bold text-[#0F7A3A]">
                        <span className="size-1.5 rounded-full bg-[#1AB75A]" />
                        Активен
                      </span>
                    )}
                  </Td>
                  <Td className="text-right">
                    {!t.deleted_at ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="grid size-9 place-items-center rounded-full text-[#7A37F0] transition hover:bg-[#F1E8FF]"
                          onClick={() => setMode({ kind: 'edit', template: t })}
                          aria-label="Редактировать"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="grid size-9 place-items-center rounded-full text-[#C42929] transition hover:bg-[#FFEDED] disabled:opacity-50"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Удалить шаблон #${t.template_id}? Активные комнаты доиграют до конца.`)) {
                              deleteMutation.mutate(t.template_id)
                            }
                          }}
                          aria-label="Удалить"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              ))}
              {templates.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-[13px] text-[#9A9A9A]">
                    Шаблонов пока нет.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Th({ children, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th {...rest} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider">
      {children}
    </th>
  )
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-5 py-3 ${className ?? ''}`}>{children}</td>
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ECECEC] bg-white p-6 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
      <h2 className="mb-4 text-[18px] font-black text-[#111]">{title}</h2>
      {children}
    </div>
  )
}
