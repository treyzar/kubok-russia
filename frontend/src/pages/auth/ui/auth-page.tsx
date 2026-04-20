import { AuthLoginForm } from './auth-login-form'
import type { AuthUser } from '@/features/mock-auth/model/mock-auth'

type AuthPageProps = {
  onAuthSuccess: (user: AuthUser) => void
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  return <AuthLoginForm onAuthSuccess={onAuthSuccess} />
}
