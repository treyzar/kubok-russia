import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/utils'

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({ checked, className, onCheckedChange, onClick, ...props }: SwitchProps) {
  return (
    <button
      aria-checked={checked}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input p-0.5 transition-colors outline-none',
        checked ? 'bg-primary' : 'bg-muted',
        className,
      )}
      data-slot="switch"
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          onCheckedChange?.(!checked)
        }
      }}
      role="switch"
      type="button"
      {...props}
    >
      <span
        className={cn(
          'block h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

export { Switch }
