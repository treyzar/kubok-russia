import { type AuthUser } from '@entities/user'
import { type UseMutationResult } from '@tanstack/react-query'
import { type RoomTemplate } from '@shared/types'
import { type RoomConfiguratorState, type RoomConfiguratorAnalysis } from './configurator'
export type CreateGamePageProps = {
  user: AuthUser
  onBackToGames: () => void
  onJoinGame: () => void
  onOpenLobby: (roomId: number) => void
  onLogout: () => void
}

export type GameBackground = 'altai' | 'space' | 'japan'
export type BackgroundPickerProps = {
  value: GameBackground
  onChange: (value: GameBackground) => void
}
export type ConfigFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
}
export type ConfiguratorModalProps = {
  draft: RoomConfiguratorState
  analysis: RoomConfiguratorAnalysis
  onFieldChange: (key: keyof RoomConfiguratorState, value: string) => void
  onSave: () => void
  onClose: () => void
  templateName: string
  setTemplateName: (name: string) => void
  saveTemplateMutation: UseMutationResult<RoomTemplate, Error, void>
  applyTemplate: (template: RoomTemplate) => void
  templates: RoomTemplate[]
  templateSaveSuccess: boolean
}
