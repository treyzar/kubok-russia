import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@shared/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        muted: 'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} data-slot="badge" {...props} />
}

export { Badge, badgeVariants }
