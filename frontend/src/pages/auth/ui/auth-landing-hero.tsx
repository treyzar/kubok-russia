import { UserRound } from 'lucide-react'

import { Button } from '@/shared/ui/button'

type AuthLandingHeroProps = {
  onEnterLogin: () => void
}

export function AuthLandingHero({ onEnterLogin }: AuthLandingHeroProps) {
  const navItems = ['Об игре', 'Билеты', 'Архив тиражей']
  const animatedButtonBase = 'hero-btn'

  return (
    <main className="min-h-screen w-full bg-[#0D0E12] text-[#F3F3F3]">
      <div className="flex min-h-screen w-full flex-col border-y border-[#232833] bg-[#090B10]">
        <header className="border-b border-[#232833] bg-[#12151C]">
          <div className="grid h-[78px] grid-cols-[1fr_auto] items-center gap-3 px-4 sm:h-[84px] sm:px-6 lg:h-[92px] lg:grid-cols-[auto_1fr_auto] lg:px-12">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <img alt="Ночной жор" className="h-[44px] w-[44px] shrink-0 sm:h-[52px] sm:w-[52px]" src="/dev-assets/images/logo.svg" />
              <p className="truncate text-[clamp(1.3rem,2.8vw,1.65rem)] leading-none font-semibold tracking-[0.02em] text-[#F5F5F5] uppercase">
                Ночной жор
              </p>
            </div>

            <nav className="hidden items-center justify-center gap-10 lg:flex xl:gap-14">
              {navItems.map((item) => (
                <Button
                  className={`hero-btn-nav h-auto rounded-none px-0 py-0 text-[23px] leading-none font-semibold tracking-[0.01em] text-[#F2F2F2] !bg-transparent hover:!bg-transparent hover:text-[#DADDE4] xl:text-[27px] ${animatedButtonBase}`}
                  key={item}
                  onClick={onEnterLogin}
                  type="button"
                  variant="ghost"
                >
                  {item}
                </Button>
              ))}
            </nav>

            <Button
              className={`hero-btn-primary h-[40px] rounded-[10px] bg-gradient-to-r from-[#7D28F2] to-[#6B20D2] px-3 text-[20px] font-semibold text-white hover:from-[#8C39FA] hover:to-[#7727E3] sm:h-[44px] sm:px-4 sm:text-[24px] ${animatedButtonBase}`}
              onClick={onEnterLogin}
              type="button"
            >
              Войти
              <span className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/45 bg-[#6921CF] sm:h-8 sm:w-8">
                <UserRound className="size-4" />
              </span>
            </Button>
          </div>

          <nav className="flex gap-2 overflow-x-auto border-t border-[#232833] px-4 py-3 lg:hidden">
            {navItems.map((item) => (
              <Button
                className={`hero-btn-chip h-[38px] shrink-0 rounded-[8px] border border-[#313645] !bg-[#1A1E27] px-3 text-[15px] font-medium text-[#F2F2F2] hover:border-[#59617A] hover:!bg-[#252A36] ${animatedButtonBase}`}
                key={item}
                onClick={onEnterLogin}
                type="button"
                variant="outline"
              >
                {item}
              </Button>
            ))}
          </nav>
        </header>

        <section className="grid min-h-[calc(100vh-126px)] flex-1 border-b border-[#232833] lg:min-h-[calc(100vh-92px)] lg:grid-cols-[56%_44%]">
          <div className="flex items-center justify-center border-b border-[#232833] px-4 py-9 sm:px-6 sm:py-12 lg:border-r lg:border-b-0 lg:px-10 lg:py-0">
            <div className="w-full max-w-[640px] text-center">
              <p className="text-[clamp(2.2rem,5.2vw,3.5rem)] leading-[1.04] font-semibold tracking-[0.01em] text-[#B6EE69] uppercase">
                Ночной жор
              </p>
              <img alt="" className="mx-auto mt-3 h-[clamp(3.6rem,8vw,4.6rem)] w-[clamp(3.6rem,8vw,4.6rem)]" src="/dev-assets/images/fridge.svg" />

              <h1 className="mt-6 text-[clamp(2.8rem,6.8vw,4.3rem)] leading-[1.06] font-semibold text-[#F3F3F3]">
                Попробуй удачу на
                <br />
                вкус!
              </h1>

              <div className="mx-auto mt-8 h-px w-full bg-[#3C3F47] sm:mt-10" />

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:mt-10 sm:flex-row sm:justify-center sm:gap-3.5">
                <Button
                  className={`hero-btn-primary h-[48px] w-full rounded-[10px] bg-gradient-to-r from-[#7D28F2] to-[#6D20D7] text-[18px] font-medium text-[#F7F7F8] hover:from-[#8C39FA] hover:to-[#7C30E8] sm:h-[52px] sm:w-auto sm:min-w-[240px] sm:text-[22px] lg:min-w-[250px] lg:text-[24px] ${animatedButtonBase}`}
                  onClick={onEnterLogin}
                  type="button"
                >
                  Зарегистрироваться
                </Button>
                <Button
                  className={`hero-btn-secondary h-[48px] w-full rounded-[10px] border border-[#B6178A] !bg-[#2A1025] px-6 text-[18px] font-medium text-[#F2EFF4] hover:border-[#D923A4] hover:!bg-[#3A1533] sm:h-[52px] sm:w-auto sm:min-w-[240px] sm:text-[22px] lg:min-w-[250px] lg:text-[24px] ${animatedButtonBase}`}
                  onClick={onEnterLogin}
                  type="button"
                  variant="outline"
                >
                  Телеграм канал
                </Button>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[300px] items-end justify-center overflow-hidden px-4 pt-6 pb-0 sm:min-h-[380px] sm:px-8 sm:pt-8 lg:min-h-0 lg:px-10">
            <img
              alt="Холодильник для первого экрана"
              className="w-full max-w-[min(82vw,496px)] object-contain lg:translate-y-[6px]"
              src="/dev-assets/big_fridge.svg"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(9,11,16,0.18)_0%,rgba(9,11,16,0)_42%)]" />
          </div>
        </section>
      </div>
    </main>
  )
}
