import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { ApiClientError, createRoom, createRoomTemplate, listRoomTemplates, queryClient, validateRoom } from '@shared/api'
import type { GameType, RoomTemplate, RoomValidationResult } from '@shared/types'

import { analyzeRoomConfigurator, initialRoomConfiguratorState } from '../model/configurator'
import type { RoomConfiguratorState } from '../model/configurator'
import type { GameBackground } from '../model/types'

export function useCreateGame() {
  const [playersCount, setPlayersCount] = useState('10')
  const [startPrice, setStartPrice] = useState('3000')
  const [background, setBackground] = useState<GameBackground>('altai')
  const [showTutorial, setShowTutorial] = useState(false)
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false)
  const [configDraft, setConfigDraft] = useState<RoomConfiguratorState>(initialRoomConfiguratorState)
  const [configSaved, setConfigSaved] = useState(false)
  const [validationResult, setValidationResult] = useState<RoomValidationResult | null>(null)
  const [actionError, setActionError] = useState('')
  const [templateName, setTemplateName] = useState('')
  const [templateSaveSuccess, setTemplateSaveSuccess] = useState(false)

  const templatesQuery = useQuery({
    queryKey: ['room-templates', 'create-game'],
    queryFn: async () => {
      const response = await listRoomTemplates()
      return response.templates
    },
  })

  const effectiveTemplateId = templatesQuery.data?.[0]?.template_id ?? null

  const createRoomMutation = useMutation({
    mutationFn: () =>
      createRoom({
        template_id: effectiveTemplateId ?? undefined,
        jackpot: 0,
        status: 'new',
        players_needed: configDraft.seatsTotal,
        min_players: Math.min(2, configDraft.seatsTotal),
        entry_cost: configDraft.entryCost,
        winner_pct: configDraft.prizeFundPercent,
        game_type: mapBackgroundToGameType(background),
      }),
  })

  const saveTemplateMutation = useMutation({
    mutationFn: () =>
      createRoomTemplate({
        name: templateName,
        players_needed: configDraft.seatsTotal,
        entry_cost: configDraft.entryCost,
        winner_pct: configDraft.prizeFundPercent,
        game_type: mapBackgroundToGameType(background),
      }),
    onSuccess: () => {
      setTemplateSaveSuccess(true)
      void queryClient.invalidateQueries({ queryKey: ['room-templates'] })
    },
  })

  useEffect(() => {
    let isCancelled = false

    const timeoutId = window.setTimeout(async () => {
      try {
        const result = await validateRoom({
          players_needed: configDraft.seatsTotal,
          entry_cost: configDraft.entryCost,
          winner_pct: configDraft.prizeFundPercent,
        })
        if (isCancelled) {
          return
        }
        setValidationResult({
          prize_fund: typeof result.prize_fund === 'number' ? result.prize_fund : 0,
          organiser_cut: typeof result.organiser_cut === 'number' ? result.organiser_cut : 0,
          player_roi: typeof result.player_roi === 'number' ? result.player_roi : 0,
          player_win_probability: typeof result.player_win_probability === 'number' ? result.player_win_probability : 0,
          warnings: Array.isArray(result.warnings) ? result.warnings : [],
        })
      } catch {
        if (isCancelled) {
          return
        }
        setValidationResult(null)
      }
    }, 300)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [configDraft.entryCost, configDraft.prizeFundPercent, configDraft.seatsTotal])

  const fallbackAnalysis = useMemo(() => analyzeRoomConfigurator(configDraft), [configDraft])
  const configAnalysis = useMemo(() => {
    if (!validationResult) {
      return fallbackAnalysis
    }

    const attractivenessScore = Math.max(0, Math.min(100, Math.round(validationResult.player_roi * 100)))
    const organizerScore = Math.max(0, Math.min(100, 100 - configDraft.prizeFundPercent))

    const warnings = Array.isArray(validationResult.warnings) ? validationResult.warnings : []

    return {
      ...fallbackAnalysis,
      attractivenessScore,
      organizerScore,
      warnings: warnings.length > 0 ? warnings : fallbackAnalysis.warnings,
      canSave: fallbackAnalysis.errors.length === 0,
    }
  }, [configDraft.prizeFundPercent, fallbackAnalysis, validationResult])

  const templatesInfo = useMemo(() => {
    if (templatesQuery.isLoading) {
      return 'Загружаем шаблоны...'
    }

    if (templatesQuery.error) {
      return 'Не удалось загрузить шаблоны. Создание доступно в ручном режиме.'
    }

    const templatesCount = templatesQuery.data?.length ?? 0
    if (templatesCount === 0) {
      return 'Шаблоны не найдены. Используется ручная конфигурация.'
    }

    return `Шаблонов доступно: ${templatesCount}`
  }, [templatesQuery.data, templatesQuery.error, templatesQuery.isLoading])

  function updateConfigField<K extends keyof RoomConfiguratorState>(key: K, rawValue: string): void {
    const parsedValue = Number(rawValue || 0)
    setConfigDraft((prev) => ({ ...prev, [key]: parsedValue }))
    setActionError('')

    if (key === 'seatsTotal') {
      setPlayersCount(String(parsedValue))
    }
    if (key === 'entryCost') {
      setStartPrice(String(parsedValue))
    }
  }

  function saveConfig(): void {
    setPlayersCount(String(configDraft.seatsTotal))
    setStartPrice(String(configDraft.entryCost))
    setConfigSaved(true)
    setIsConfiguratorOpen(false)
  }

  function applyTemplate(template: RoomTemplate): void {
    setConfigDraft((prev) => ({
      ...prev,
      seatsTotal: template.players_needed,
      entryCost: template.entry_cost,
      prizeFundPercent: template.winner_pct,
    }))
    setPlayersCount(String(template.players_needed))
    setStartPrice(String(template.entry_cost))
  }

  function handlePlayersCountChange(rawValue: string): void {
    setPlayersCount(rawValue)
    setConfigDraft((prev) => ({ ...prev, seatsTotal: Number(rawValue || 0) }))
    setActionError('')
  }

  function handleStartPriceChange(rawValue: string): void {
    setStartPrice(rawValue)
    setConfigDraft((prev) => ({ ...prev, entryCost: Number(rawValue || 0) }))
    setActionError('')
  }

  async function handleCreateRoom(onCreated: (roomId: number) => void): Promise<void> {
    try {
      setActionError('')
      const room = await createRoomMutation.mutateAsync()
      onCreated(room.room_id)
    } catch (error: unknown) {
      setActionError(mapCreateRoomError(error))
    }
  }

  return {
    playersCount,
    handlePlayersCountChange,
    startPrice,
    handleStartPriceChange,
    background,
    setBackground,
    showTutorial,
    setShowTutorial,
    isConfiguratorOpen,
    setIsConfiguratorOpen,
    configDraft,
    updateConfigField,
    configAnalysis,
    configSaved,
    saveConfig,
    templatesInfo,
    templates: templatesQuery.data ?? [],
    isCreatingRoom: createRoomMutation.isPending,
    actionError,
    handleCreateRoom,
    templateName,
    setTemplateName,
    saveTemplateMutation,
    applyTemplate,
    templateSaveSuccess,
  }
}

function mapBackgroundToGameType(background: GameBackground): GameType {
  if (background === 'japan') {
    return 'fridge'
  }
  return 'train'
}

function mapCreateRoomError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message || 'Не удалось создать комнату. Проверьте параметры и попробуйте снова.'
  }
  return 'Не удалось создать комнату. Проверьте соединение и попробуйте ещё раз.'
}
