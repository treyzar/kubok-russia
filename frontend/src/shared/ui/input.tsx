import type { InputHTMLAttributes } from 'react'

import { cn } from '@shared/lib/utils'

function Input({ className, type = 'text', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40',
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  )
}

export { Input }
