import { useState } from 'react'

import { AuthLandingHero } from './auth-landing-hero'
import { AuthLoginForm } from './auth-login-form'
import type { AuthUser } from '@entities/user'

type AuthPageProps = {
  onAuthSuccess: (user: AuthUser) => void
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [view, setView] = useState<'landing' | 'login'>('landing')

  if (view === 'landing') {
    return <AuthLandingHero onEnterLogin={() => setView('login')} />
  }

  return <AuthLoginForm onAuthSuccess={onAuthSuccess} />
}
