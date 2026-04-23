import type { LucideIcon } from 'lucide-react'

import { type AuthUser } from '@entities/user'

export type ActiveMechanicBrand = {
  /** Visible brand name in upper-case (e.g. «НОЧНОЙ ЖОР»). */
  name: string
  /** Single capital letter shown inside the round logo tile. */
  letter: string
  /** Optional lucide icon shown next to the brand letter on wider screens. */
  Icon?: LucideIcon
  /** Gradient stops for the round logo tile. */
  from: string
  to: string
  /** Optional badge label (e.g. «HOT», «СКОРО»). */
  badge?: string
  badgeBg?: string
}

export type AppHeaderProps = {
  user: AuthUser
  onBrandClick?: () => void
  onLogout?: () => void
  onOpenAdmin?: () => void
  /**
   * When provided, the header brand (logo + name) reflects the active game
   * mechanic. When undefined, the default «НОЧНОЙ ЖОР» fallback is shown.
   */
  activeMechanic?: ActiveMechanicBrand
  /** Optional small live status text shown in the header center. */
  liveStatusText?: string
  className?: string
  contentClassName?: string
}
