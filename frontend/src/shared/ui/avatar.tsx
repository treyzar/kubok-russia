import type { HTMLAttributes, ImgHTMLAttributes } from 'react'

import { cn } from '@shared/lib/utils'

function Avatar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <span
      className={cn('relative inline-flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)}
      data-slot="avatar"
      {...props}
    />
  )
}

function AvatarImage({ className, alt = '', ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return <img alt={alt} className={cn('h-full w-full object-cover', className)} data-slot="avatar-image" {...props} />
}

function AvatarFallback({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground', className)}
      data-slot="avatar-fallback"
      {...props}
    />
  )
}

export { Avatar, AvatarFallback, AvatarImage }
