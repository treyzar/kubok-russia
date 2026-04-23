import type { HTMLAttributes } from 'react'
import { type VariantProps } from 'class-variance-authority'

import { cn } from '@shared/lib/utils'

import { badgeVariants } from './badge-variants'

function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} data-slot="badge" {...props} />
}

export { Badge }
