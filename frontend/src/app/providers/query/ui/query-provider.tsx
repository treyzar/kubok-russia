import { QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'

import { queryClient } from '@shared/api/query-client'

type Props = {
  children: ReactNode
}

export function QueryProvider({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
