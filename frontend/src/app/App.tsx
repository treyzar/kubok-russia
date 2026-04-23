import { AppRouter } from './providers/router'
import { QueryProvider } from './providers/query'

export function App() {
  return (
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  )
}
