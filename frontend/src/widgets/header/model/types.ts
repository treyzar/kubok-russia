import { type AuthUser } from '@entities/user'

export type AppHeaderProps = {
  user: AuthUser
  onBrandClick?: () => void
  onLogout?: () => void
  onOpenAdmin?: () => void
  className?: string
  contentClassName?: string
}
