import type { User } from '@shared/types'

import { apiRequest } from './client'

type CreateUserBody = {
  name: string
  balance: number
}

export function createUser(body: CreateUserBody): Promise<User> {
  return apiRequest<User>({
    method: 'POST',
    url: '/users',
    data: body,
  })
}

export function getUser(userId: number): Promise<User> {
  return apiRequest<User>({
    method: 'GET',
    url: `/users/${userId}`,
  })
}

