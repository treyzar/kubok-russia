import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { getMockPassword, getMockUsers, loginWithMock } from '@entities/user'
import type { AuthUser } from '@entities/user'
import { resolveApiUserId } from '@processes/auth-session'
import { getUser } from '@shared/api'
import { loginSchema } from '../model/schema'
import type { LoginFormValues } from '../model/schema'

type UseLoginFormOptions = {
  onSuccess: (user: AuthUser) => void
}

export function useLoginForm({ onSuccess }: UseLoginFormOptions) {
  const users = getMockUsers()
  const [method, setMethod] = useState<'phone' | 'email'>('email')
  const [isApiLoading, setIsApiLoading] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      method,
      username: users[0]?.email ?? '',
      password: '',
    },
  })

  async function onSubmit(values: LoginFormValues): Promise<void> {
    const authUser = loginWithMock(values.username, values.password, values.method)

    if (!authUser) {
      form.setError('root', {
        message: 'Неверный логин или пароль. Используйте один из демо-аккаунтов ниже.',
      })
      return
    }

    setIsApiLoading(true)
    try {
      const apiUserId = await resolveApiUserId(authUser.id, authUser.name, authUser.balance)
      const apiUser = await getUser(apiUserId)
      onSuccess({ ...authUser, balance: apiUser.balance })
    } catch {
      form.setError('root', { message: 'Ошибка подключения к серверу. Попробуйте снова.' })
    } finally {
      setIsApiLoading(false)
    }
  }

  function switchMethod(next: 'phone' | 'email'): void {
    setMethod(next)
    form.setValue('method', next)
    const firstUser = users[0]
    if (firstUser) {
      form.setValue('username', next === 'phone' ? firstUser.phone : firstUser.email)
    }
    form.clearErrors('root')
  }

  function fillDemoUser(userId: string): void {
    const user = users.find((u) => u.id === userId)
    if (!user) return
    form.setValue('username', method === 'phone' ? user.phone : user.email)
    form.setValue('password', getMockPassword(user.username) ?? '')
    form.clearErrors('root')
  }

  return {
    form,
    method,
    users,
    isApiLoading,
    onSubmit: form.handleSubmit(onSubmit),
    switchMethod,
    fillDemoUser,
  }
}
