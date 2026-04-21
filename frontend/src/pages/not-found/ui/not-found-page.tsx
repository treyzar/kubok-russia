import { UserRound } from 'lucide-react'

import { Button } from '@/shared/ui/button'
import { MiniFooter } from '@/shared/ui/mini-footer'

const navItems = ['Об игре', 'Билеты', 'Архив тиражей']

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh w-full flex-col overflow-x-clip bg-[#111319] text-[#F3F4F7]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#141824]/92 backdrop-blur">
        <div className="grid h-[74px] w-full grid-cols-[1fr_auto] items-center gap-3 px-4 sm:h-[84px] sm:px-6 lg:h-[92px] lg:grid-cols-[auto_1fr_auto] lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <img alt="Ночной жор" className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" src="/dev-assets/images/logo.svg" />
            <p className="truncate text-[clamp(1.05rem,2.2vw,1.5rem)] leading-none font-semibold tracking-[0.02em] text-[#F5F7FA] uppercase">
              Ночной жор
            </p>
          </div>

          <nav className="hidden items-center justify-center gap-10 lg:flex">
            {navItems.map((item) => (
              <button
                className="cursor-pointer text-[clamp(1rem,1.25vw,1.28rem)] leading-none font-semibold text-[#DCE2EC] transition-colors hover:text-white"
                key={item}
                type="button"
              >
                {item}
              </button>
            ))}
          </nav>

          <Button
            className="h-10 rounded-[10px] bg-gradient-to-r from-[#7D28F2] to-[#6B20D2] px-3 text-[clamp(0.95rem,1.8vw,1.2rem)] font-semibold text-white hover:from-[#8B37F8] hover:to-[#7729DF] sm:h-11 sm:px-4"
            type="button"
          >
            Войти
            <span className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/45 bg-[#6A23D1]">
              <UserRound className="size-4" />
            </span>
          </Button>
        </div>
      </header>

      <section className="relative flex flex-1 w-full items-center justify-center overflow-hidden px-4 py-10 text-[#F3F4F7]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(76,123,210,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
        <div className="pointer-events-none absolute inset-0 border-y border-white/12" />

        <div className="relative flex w-full max-w-[860px] flex-col items-center">
          <h1 className="text-center text-[clamp(2.55rem,6.2vw,4.05rem)] leading-none font-semibold text-[#F3F4F7]">Ошибка 404</h1>
          <div className="relative mt-5 w-full max-w-[560px]">
            <div className="pointer-events-none absolute inset-x-[8%] top-[12%] h-[72%] rounded-full bg-[#9FC6FF]/26 blur-[58px]" />
            <img
              alt="Ледяной кубик маскот"
              className="relative mx-auto w-full max-w-[560px] object-contain"
              src="/dev-assets/mascot_3.svg"
            />
          </div>
        </div>
      </section>
      <MiniFooter />
    </main>
  )
}
