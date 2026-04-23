import type { CreateTemplateBody, RoomTemplate, TemplatesResponse } from '@shared/types'

import { apiRequest } from './client'

export function listRoomTemplates(): Promise<TemplatesResponse> {
  return apiRequest<TemplatesResponse>({
    method: 'GET',
    url: '/room-templates',
  })
}

export function getRoomTemplate(templateId: number): Promise<RoomTemplate> {
  return apiRequest<RoomTemplate>({
    method: 'GET',
    url: `/room-templates/${templateId}`,
  })
}

export function createRoomTemplate(body: CreateTemplateBody): Promise<RoomTemplate> {
  return apiRequest<RoomTemplate>({
    method: 'POST',
    url: '/room-templates',
    data: body,
  })
}

