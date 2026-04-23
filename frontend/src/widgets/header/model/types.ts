import { type AuthUser } from '@entities/user'

export type AppHeaderProps = {
  user: AuthUser
  onCreateGame?: () => void
  onBrandClick?: () => void
  onLogout?: () => void
  className?: string
  contentClassName?: string
}
