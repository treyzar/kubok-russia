import { Badge, Switch } from '@shared/ui'
import type { LandingTheme } from '../model/types'

type ThemeToggleProps = {
  theme: LandingTheme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--landing-border)] bg-[var(--landing-muted-surface)] px-2.5 py-2 sm:px-3">
      <Switch checked={theme === 'light'} className="h-6 w-11" onCheckedChange={onToggle} />
      <Badge
        className="rounded-[8px] border border-transparent bg-transparent px-1.5 text-[0.83rem] font-semibold text-[var(--landing-text)] sm:text-[0.92rem]"
        variant="outline"
      >
        {theme === 'dark' ? 'Светлая' : 'Тёмная'}
      </Badge>
    </div>
  )
}
