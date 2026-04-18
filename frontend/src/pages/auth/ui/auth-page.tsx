import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import {
  type AuthLoginMethod,
  type AuthUser,
  getMockPassword,
  getMockUsers,
  loginWithMock,
} from '@/features/mock-auth/model/mock-auth'

type AuthPageProps = {
  onAuthSuccess: (user: AuthUser) => void
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const users = useMemo(() => getMockUsers(), [])

  const [authMethod, setAuthMethod] = useState<AuthLoginMethod>('email')
  const [username, setUsername] = useState(users[0]?.email ?? '')
  const [password, setPassword] = useState('')
  const [isUsernameFocused, setIsUsernameFocused] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [errorText, setErrorText] = useState('')

  const isUsernameFloating = isUsernameFocused || username.trim().length > 0
  const isPasswordFloating = isPasswordFocused || password.trim().length > 0

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const authUser = loginWithMock(username, password, authMethod)

    if (!authUser) {
      setErrorText('Неверный логин или пароль. Используйте один из демо-аккаунтов ниже.')
      return
    }

    setErrorText('')
    onAuthSuccess(authUser)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FCFCFC] text-[#222222]">
      <div className="auth-aurora auth-aurora--one" />
      <div className="auth-aurora auth-aurora--two" />
      <div className="auth-aurora auth-aurora--three" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,209,0,0.22),transparent_30%),radial-gradient(circle_at_78%_84%,rgba(255,209,0,0.18),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(34,211,238,0.18),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,209,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,209,0,0.08)_1px,transparent_1px)] bg-[size:58px_58px] opacity-45" />
      <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_220deg_at_70%_35%,rgba(255,209,0,0.15),rgba(125,211,252,0.15),rgba(255,255,255,0.08),rgba(255,209,0,0.15))] mix-blend-multiply opacity-40" />
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full border border-[#FFD100]/30" />
      <div className="pointer-events-none absolute -bottom-20 -right-16 h-80 w-80 rounded-full border border-[#FFD100]/25" />
      <div className="pointer-events-none absolute top-24 right-16 hidden h-12 w-44 rounded-full border border-[#FFD100]/35 lg:block" />
      <div className="pointer-events-none absolute top-1/2 left-10 hidden h-32 w-32 -translate-y-1/2 rounded-full border border-dashed border-[#FFD100]/35 lg:block" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#E4E4E4] bg-[#F6F6F6]/95 px-6 py-8 shadow-[0_22px_60px_rgba(16,24,40,0.18)] backdrop-blur-sm sm:px-8">
          <h1 className="text-center text-[2rem] leading-none font-semibold text-[#111111]">Вход</h1>

          <div className="relative mt-6 grid grid-cols-2 rounded-2xl bg-[#E5E5E5] p-1.5">
            <span
              className={`absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-xl bg-[#FFD100] shadow-[0_8px_16px_rgba(255,209,0,0.35)] transition-transform duration-300 ${
                authMethod === 'email' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <button
              className={`relative z-10 h-11 rounded-xl text-lg font-semibold transition-colors duration-200 ${
                authMethod === 'phone' ? 'text-[#111111]' : 'text-[#333333]'
              }`}
              onClick={() => {
                setAuthMethod('phone')
                if (users[0]) {
                  setUsername(users[0].phone)
                }
              }}
              type="button"
            >
              Телефон
            </button>
            <button
              className={`relative z-10 h-11 rounded-xl text-lg font-semibold transition-colors duration-200 ${
                authMethod === 'email' ? 'text-[#111111]' : 'text-[#333333]'
              }`}
              onClick={() => {
                setAuthMethod('email')
                if (users[0]) {
                  setUsername(users[0].email)
                }
              }}
              type="button"
            >
              Почта
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <label className="block">
              <div
                className={`relative rounded-2xl border bg-white transition-all duration-200 ${
                  isUsernameFocused
                    ? 'border-[#FFD100] shadow-[0_0_0_3px_rgba(255,209,0,0.25)]'
                    : 'border-[#C9C9C9] hover:border-[#B7B7B7]'
                }`}
              >
                <span
                  className={`pointer-events-none absolute left-4 inline-flex items-center gap-1.5 text-[#7B7B7B] transition-all duration-200 ${
                    isUsernameFloating ? 'top-2 text-[11px] font-medium' : 'top-1/2 -translate-y-1/2 text-lg'
                  }`}
                >
                  {authMethod === 'phone' ? <Phone size={13} /> : <Mail size={13} />}
                  {authMethod === 'phone' ? 'Телефон' : 'Почта'}
                </span>
                <input
                  autoComplete="username"
                  className="h-14 w-full rounded-2xl bg-transparent px-4 pt-6 pb-2 text-lg text-[#111111] outline-none placeholder:text-transparent"
                  onBlur={() => setIsUsernameFocused(false)}
                  onChange={(event) => setUsername(event.target.value)}
                  onFocus={() => setIsUsernameFocused(true)}
                  placeholder={authMethod === 'phone' ? '+7 (___) ___-__-__' : 'Введите почту'}
                  value={username}
                />
              </div>
            </label>

            <label className="block">
              <div
                className={`relative rounded-2xl border bg-white transition-all duration-200 ${
                  isPasswordFocused
                    ? 'border-[#FFD100] shadow-[0_0_0_3px_rgba(255,209,0,0.25)]'
                    : 'border-[#C9C9C9] hover:border-[#B7B7B7]'
                } ${errorText ? 'auth-shake' : ''}`}
              >
                <span
                  className={`pointer-events-none absolute left-4 inline-flex items-center gap-1.5 text-[#7B7B7B] transition-all duration-200 ${
                    isPasswordFloating ? 'top-2 text-[11px] font-medium' : 'top-1/2 -translate-y-1/2 text-lg'
                  }`}
                >
                  <LockKeyhole size={13} />
                  Пароль
                </span>
                <input
                  autoComplete="current-password"
                  className="h-14 w-full rounded-2xl bg-transparent px-4 pt-6 pb-2 pr-11 text-lg text-[#111111] outline-none placeholder:text-transparent"
                  onBlur={() => setIsPasswordFocused(false)}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setIsPasswordFocused(true)}
                  placeholder="Введите пароль"
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-[#A5A5A5] transition hover:bg-[#F3F3F3] hover:text-[#636363]"
                  onClick={() => setIsPasswordVisible((value) => !value)}
                  type="button"
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#6A6A6A] transition hover:text-[#4C4C4C]">Забыли пароль?</p>
              <p className="text-xs text-[#9A9A9A]">Нажмите Enter для входа</p>
            </div>

            {errorText ? (
              <p className="rounded-xl border border-[#E9B4B4] bg-[#FFE9E9] px-3 py-2 text-sm text-[#A33E3E]">{errorText}</p>
            ) : null}

            <Button
              className="mt-1 h-13 w-full rounded-2xl bg-[#FFD100] text-lg font-semibold text-[#111111] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#F2C400] active:translate-y-0"
              size="lg"
              type="submit"
            >
              Войти
              <ArrowRight className="transition-transform duration-200 group-hover/button:translate-x-0.5" size={17} />
            </Button>
          </form>

          <div className="mt-7 text-center text-[1.7rem] leading-none text-[#929292]">или войти через</div>

          <div className="mt-5 space-y-3">
            <button
              className="h-13 w-full rounded-2xl border border-[#C9C9C9] bg-white text-lg font-semibold text-[#232323] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F8F8F8] active:translate-y-0"
              type="button"
            >
              Яндекс ID
            </button>
            <button
              className="h-13 w-full rounded-2xl border border-[#C9C9C9] bg-white text-lg font-semibold text-[#232323] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F8F8F8] active:translate-y-0"
              type="button"
            >
              VK ID
            </button>
          </div>

          <div className="mt-6 border-t border-[#D8D8D8] pt-5">
            <p className="text-xs tracking-wide text-[#8A8A8A] uppercase">Демо-профили</p>
            <ul className="mt-3 space-y-2">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    className="w-full rounded-xl border border-[#D5D5D5] bg-white px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FFD100] hover:bg-[#FFFDF3] active:translate-y-0"
                    onClick={() => {
                      setUsername(authMethod === 'phone' ? user.phone : user.email)
                      setPassword(getMockPassword(user.username) ?? '')
                      setErrorText('')
                    }}
                    type="button"
                  >
                    <span className="block text-sm font-medium text-[#1E1E1E]">{user.name}</span>
                    <span className="mt-1 block text-xs text-[#717171]">
                      {authMethod === 'phone' ? user.phone : user.email}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#8B8B8B]">
                      @{user.username} • {user.balance.toLocaleString('ru-RU')} баллов
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  )
}
