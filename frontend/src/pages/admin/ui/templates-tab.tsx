import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import {
  type AdminTemplateListItem,
  type AdminTemplatePayload,
  createAdminTemplate,
  deleteAdminTemplate,
  listAdminTemplates,
  updateAdminTemplate,
} from '@shared/api'
import { Badge, Button } from '@shared/ui'

import { TemplateForm } from './template-form'

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; template: AdminTemplateListItem }

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
      <div className="flex items-center justify-between">
        <h2 className="text-[1.25rem] font-semibold text-[#F2F3F5]">Шаблоны комнат</h2>
        <Button
          className="gap-2 bg-[#A8E45E] text-[#101114] hover:bg-[#B9ED76]"
          onClick={() => setMode({ kind: 'create' })}
        >
          <Plus className="size-4" />
          Создать
        </Button>
      </div>

      {isLoading ? <p className="text-[#9098A8]">Загрузка…</p> : null}
      {error ? <p className="text-red-400">Не удалось загрузить шаблоны.</p> : null}

      <div className="overflow-x-auto rounded-md border border-[#2B2C30]">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead className="bg-[#1B1C22] text-[#9098A8]">
            <tr>
              <Th>ID</Th>
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
              <tr key={t.template_id} className="border-t border-[#2B2C30] text-[#F2F3F5]">
                <Td>#{t.template_id}</Td>
                <Td>{t.game_type === 'fridge' ? 'Ночной жор' : t.game_type}</Td>
                <Td>{t.min_players}/{t.max_players}</Td>
                <Td>{t.entry_cost.toLocaleString('ru-RU')}</Td>
                <Td>{t.winner_pct}%</Td>
                <Td>{t.completed_rooms}</Td>
                <Td>
                  {t.deleted_at ? (
                    <Badge className="bg-[#3A1A1A] text-[#FFB4B4]">Удалён</Badge>
                  ) : (
                    <Badge className="bg-[#1F3A1A] text-[#B5F49A]">Активен</Badge>
                  )}
                </Td>
                <Td className="text-right">
                  {!t.deleted_at ? (
                    <div className="flex justify-end gap-1">
                      <Button
                        className="size-9 p-0 text-[#A8E45E]"
                        size="icon"
                        variant="ghost"
                        onClick={() => setMode({ kind: 'edit', template: t })}
                        aria-label="Редактировать"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        className="size-9 p-0 text-[#FFB4B4]"
                        size="icon"
                        variant="ghost"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Удалить шаблон #${t.template_id}? Активные комнаты доиграют до конца.`)) {
                            deleteMutation.mutate(t.template_id)
                          }
                        }}
                        aria-label="Удалить"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </Td>
              </tr>
            ))}
            {templates.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[#9098A8]">
                  Шаблонов пока нет.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th {...rest} className="px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide">
      {children}
    </th>
  )
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className ?? ''}`}>{children}</td>
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#2B2C30] bg-[#181920] p-5">
      <h2 className="mb-4 text-[1.15rem] font-semibold text-[#F2F3F5]">{title}</h2>
      {children}
    </div>
  )
}
