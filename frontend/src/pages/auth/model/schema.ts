import { z } from 'zod'
import type { AuthLoginMethod } from '@entities/user'

export const loginSchema = z.object({
  method: z.enum(['phone', 'email']),
  username: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export type { AuthLoginMethod }
