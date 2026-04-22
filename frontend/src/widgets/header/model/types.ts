import { type AuthUser } from '@entities/user'

export type AppHeaderProps = {
  user: AuthUser
  onCreateGame?: () => void
  onBrandClick?: () => void
  className?: string
  contentClassName?: string
}
