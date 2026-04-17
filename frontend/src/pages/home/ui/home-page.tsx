import { Button } from '@/shared/ui/button'

export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-start justify-center gap-6 p-6">
      <h1 className="text-4xl font-semibold tracking-tight">kubok-Russia</h1>
      <p className="text-muted-foreground">Vite + TypeScript + shadcn/ui + FSD</p>
      <Button>Начать</Button>
    </main>
  )
}
