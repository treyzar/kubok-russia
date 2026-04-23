import { UserRound } from 'lucide-react'
import { Badge, Button, Card, CardContent, MiniFooter, Separator } from '@shared/ui'

import { useCarousel, useLandingTheme } from '../lib'
import {
  CHAMPION_VARIANTS,
  DARK_THEME_VARS,
  FRIDGE_SLOTS,
  LANDING_STEPS,
  LIGHT_THEME_VARS,
  NAV_ITEMS,
  type AuthLandingHeroProps
} from '../model'
import { ChampionNavButtons } from './champion-nav-buttons'
import { RightWinnersCard } from './right-winners-card'
import { ThemeToggle } from './theme-toggle'


export function AuthLandingHero({ onEnterLogin }: AuthLandingHeroProps) {
  const { theme, toggleTheme } = useLandingTheme()
  const { index: variantIndex, isSwitching, navigate } = useCarousel({ length: CHAMPION_VARIANTS.length })

  const activeVariant = CHAMPION_VARIANTS[variantIndex]
  const activeSlots = new Set(activeVariant.activeSlotIds)

  return (
    <main
      className="min-h-svh w-full overflow-x-clip bg-[var(--landing-bg)] text-[var(--landing-text)]"
      style={theme === 'light' ? LIGHT_THEME_VARS : DARK_THEME_VARS}
    >
      <div className="w-full">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-[var(--landing-border)] bg-[color:var(--landing-surface)]/95 backdrop-blur">
          <div className="grid h-[74px] w-full grid-cols-[1fr_auto] items-center gap-3 px-4 sm:h-[84px] sm:px-6 lg:h-[92px] lg:grid-cols-[auto_1fr_auto] lg:px-10">
            <button
              className="flex min-w-0 items-center gap-3 rounded-[10px] px-1 py-1 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-white/5"
              onClick={onEnterLogin}
              type="button"
            >
              <img alt="Ночной жор" className="h-9 w-9 shrink-0 sm:h-11 sm:w-11" src="/dev-assets/images/logo.svg" />
              <p className="truncate text-[clamp(1.05rem,2.2vw,1.5rem)] leading-none font-semibold tracking-[0.02em] text-[var(--landing-text-soft)] uppercase">
                Ночной жор
              </p>
            </button>

            <nav className="hidden items-center justify-center gap-10 lg:flex">
              {NAV_ITEMS.map((item) => (
                <button
                  className="cursor-pointer text-[clamp(1rem,1.25vw,1.28rem)] leading-none font-semibold text-[var(--landing-text-muted)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:text-[var(--landing-text-soft)]"
                  key={item}
                  onClick={onEnterLogin}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle onToggle={toggleTheme} theme={theme} />
              <Button
                className="h-10 rounded-[10px] bg-gradient-to-r from-[#7D28F2] to-[#6B20D2] px-3 text-[clamp(0.95rem,1.8vw,1.2rem)] font-semibold text-white hover:from-[#8B37F8] hover:to-[#7729DF] sm:h-11 sm:px-4"
                onClick={onEnterLogin}
                type="button"
              >
                Войти
                <span className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/45 bg-[#6A23D1]">
                  <UserRound className="size-4" />
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* Hero section */}
        <section className="grid min-h-[calc(100svh-74px)] w-full border-b border-[var(--landing-border)] lg:min-h-[calc(100svh-92px)] lg:grid-cols-[56%_44%]">
          <div className="flex items-center justify-center border-b border-[var(--landing-border)] px-5 py-12 lg:border-r lg:border-b-0 lg:px-10">
            <div className="w-full max-w-[670px] text-center">
              <p className="text-[clamp(2.1rem,4.8vw,3.3rem)] leading-none font-semibold tracking-[0.01em] text-[var(--landing-hero-accent)] uppercase">
                Ночной жор
              </p>
              <img alt="" className="mx-auto mt-4 h-[clamp(56px,8vw,76px)] w-[clamp(56px,8vw,76px)]" src="/dev-assets/images/fridge.svg" />
              <h1 className="mt-6 text-[clamp(2.55rem,6vw,4.15rem)] leading-[1.05] font-semibold text-[var(--landing-text-soft)]">
                Попробуй удачу на
                <br />
                вкус!
              </h1>
              <Separator className="mx-auto mt-9 w-full bg-[var(--landing-divider)]" />
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  className="relative h-[50px] overflow-hidden rounded-[10px] bg-gradient-to-r from-[#7D28F2] to-[#6D20D7] px-7 text-[clamp(1rem,2.2vw,1.38rem)] font-medium text-[#F8F8FB] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_18%_30%,rgba(255,255,255,0.35),transparent_45%)] before:opacity-0 before:transition-opacity before:duration-500 hover:-translate-y-[2px] hover:shadow-[0_16px_34px_rgba(109,32,215,0.42)] hover:before:opacity-100 sm:h-[52px] sm:px-8"
                  onClick={onEnterLogin}
                  type="button"
                >
                  <span className="relative z-10">Зарегистрироваться</span>
                </Button>
                <Button
                  className="relative h-[50px] overflow-hidden rounded-[10px] border border-[var(--landing-secondary-border)] !bg-[var(--landing-secondary-bg)] px-7 text-[clamp(1rem,2.2vw,1.38rem)] font-medium text-[var(--landing-text-soft)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:absolute before:inset-0 before:origin-left before:scale-x-0 before:bg-gradient-to-r before:from-[#B6178A] before:to-[#8B0F72] before:transition-transform before:duration-500 before:ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0_14px_30px_rgba(182,23,138,0.26)] hover:before:scale-x-100 sm:h-[52px] sm:px-8"
                  onClick={onEnterLogin}
                  type="button"
                  variant="outline"
                >
                  <span className="relative z-10 transition-colors duration-500 group-hover/button:text-white">Телеграм канал</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-[380px] items-end justify-center overflow-hidden px-5 pt-8 sm:min-h-[420px] sm:px-6">
            <img
              alt="Холодильник для первого экрана"
              className="w-full max-w-[clamp(280px,44vw,520px)] object-contain lg:translate-y-[6px]"
              src="/dev-assets/big_fridge.svg"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(9,11,16,0.2)_0%,rgba(9,11,16,0)_42%)]" />
          </div>
        </section>

        {/* Steps section */}
        <section className="w-full border-b border-[var(--landing-border)] bg-[var(--landing-bg)] px-5 py-12 sm:px-7 lg:px-10 lg:py-14">
          <h2 className="text-[clamp(2rem,4.3vw,3.3rem)] leading-[1.05] font-semibold text-[var(--landing-text-soft)]">
            Открываешь холодильник, а там...
          </h2>
          <div className="mt-10 space-y-10">
            {LANDING_STEPS.map((step, index) => {
              const reverse = index === 1
              return (
                <article className="grid items-center gap-6 lg:grid-cols-[49%_51%] lg:gap-8" key={step.title}>
                  <img
                    alt={step.alt}
                    className={`w-full rounded-[16px] object-cover ${reverse ? 'lg:order-2' : ''}`}
                    src={step.image}
                  />
                  <div className={reverse ? 'lg:order-1' : ''}>
                    <Badge
                      className="rounded-[8px] border border-transparent bg-transparent px-0 text-[clamp(1.85rem,3.8vw,2.9rem)] leading-none font-semibold text-[var(--landing-step-accent)] uppercase"
                      variant="outline"
                    >
                      {step.title}
                    </Badge>
                    <p className="mt-3 max-w-[32ch] text-[clamp(1.02rem,1.9vw,1.38rem)] leading-[1.33] font-medium text-[var(--landing-step-text)]">
                      {step.text}
                    </p>
                    {step.cta ? (
                      <Button
                        className="mt-6 h-[42px] rounded-[8px] border border-[var(--landing-outline)] !bg-[var(--landing-muted-surface)] px-4 text-[1rem] font-medium text-[var(--landing-text)] opacity-90"
                        disabled
                        type="button"
                        variant="outline"
                      >
                        {step.cta}
                      </Button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Champions section */}
        <section className="w-full border-b border-[var(--landing-border)] bg-[var(--landing-champ-bg)] px-5 py-10 sm:px-7 lg:px-10 lg:py-12">
          <h2 className="text-[clamp(2.45rem,5.2vw,4rem)] leading-[1.02] font-semibold text-[var(--landing-text-soft)]">
            Присоединяйся к чемпионам!
          </h2>
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <Card className="relative h-[488px] overflow-hidden rounded-[20px] border-transparent bg-[var(--landing-champ-card)] shadow-none">
              <CardContent className="flex h-full flex-col px-6 py-6 pb-24 sm:px-7 sm:py-7">
                <div
                  className={`grid h-full grid-cols-[1fr_150px] items-start gap-0 transition-all duration-300 sm:grid-cols-[1fr_170px] lg:grid-cols-[1fr_205px] ${
                    isSwitching ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
                  }`}
                >
                  <div className="pr-1">
                    <p className="text-[clamp(1.75rem,3.4vw,2.5rem)] leading-none font-semibold text-white/75">
                      {activeVariant.round}
                    </p>
                    <p className="mt-5 text-[clamp(1.15rem,1.9vw,1.95rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
                      Сумма выигрыша
                    </p>
                    <p className="mt-2 text-[clamp(1.85rem,3.15vw,3rem)] leading-none font-semibold text-white">
                      {activeVariant.prizeSum}
                    </p>
                    <p className="mt-5 text-[clamp(1.15rem,1.9vw,1.95rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
                      Сумма общего банка
                    </p>
                    <p className="mt-2 text-[clamp(1.85rem,3.15vw,3rem)] leading-none font-semibold text-white">
                      {activeVariant.bankSum}
                    </p>
                    <p className="mt-5 text-[clamp(1.2rem,2vw,2rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
                      Результаты игры
                    </p>
                    <p className="mt-2 text-[clamp(2rem,3.3vw,3.1rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
                      {activeVariant.gameNo}
                    </p>
                  </div>
                  <div className="flex justify-end -translate-x-4 sm:-translate-x-6 lg:-translate-x-8">
                    <div className="relative h-[300px] w-[133px] sm:h-[335px] sm:w-[148px] lg:h-[410px] lg:w-[182px]">
                      <img
                        alt="Холодильник с блоками"
                        className="absolute inset-0 h-full w-full object-contain"
                        src="/dev-assets/images/fridge_with_blocks.svg"
                      />
                      {FRIDGE_SLOTS.map((slot) => (
                        <span
                          className={`absolute z-10 flex h-[30px] w-[48px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[0.78rem] leading-none font-semibold sm:h-[32px] sm:w-[52px] sm:text-[0.82rem] ${
                            activeSlots.has(slot.id)
                              ? 'bg-[#FF1795] text-white'
                              : 'border border-[#FF1795] bg-[#2B303B]/28 text-white'
                          }`}
                          key={slot.id}
                          style={{ left: slot.left, top: slot.top }}
                        >
                          {slot.id}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <ChampionNavButtons
                  disabled={isSwitching}
                  nextLabel="Следующий результат"
                  onNext={() => navigate(1)}
                  onPrev={() => navigate(-1)}
                  prevLabel="Предыдущий результат"
                />
              </CardContent>
            </Card>

            <RightWinnersCard />
          </div>
        </section>

        {/* Talent section */}
        <section className="grid w-full items-center gap-8 border-b border-[var(--landing-border)] bg-[var(--landing-muted-surface)] px-5 py-10 sm:px-7 lg:grid-cols-[45%_55%] lg:gap-10 lg:px-10 lg:py-14">
          <div className="relative h-[320px] sm:h-[360px] lg:h-[382px]">
            <div className="pointer-events-none absolute left-[20%] top-[69%] h-[240px] w-[240px] -translate-y-1/2 rounded-full bg-[#A2C8FF]/20 blur-[54px]" />
            <div className="pointer-events-none absolute left-[37%] top-[32%] h-[260px] w-[260px] -translate-y-1/2 rounded-full bg-[#BFD8FF]/24 blur-[58px]" />
            <img
              alt="Кубик маскот 1"
              className="absolute left-[21%] top-[65%] w-[138px] -translate-y-1/2 object-contain sm:w-[156px] lg:w-[174px]"
              src="/dev-assets/images/mascot_2.svg"
            />
            <img
              alt="Кубик маскот 2"
              src="/dev-assets/images/mascot_1.svg"
            />
          </div>

          <div>
            <h2 className="max-w-[11ch] text-[clamp(2.25rem,4.3vw,3.25rem)] leading-[1.03] font-semibold text-[var(--landing-text-soft)]">
              Раскрой свой талант предугадывания
            </h2>
            <Card className="mt-6 rounded-[14px] border-[var(--landing-outline)] bg-transparent shadow-none">
              <CardContent className="px-4 py-4 sm:px-6 sm:py-5">
                <p className="text-[clamp(1.16rem,2.1vw,2.05rem)] leading-[1.3] font-medium text-[var(--landing-body-copy)]">
                  Постарайся выбрать именно то, что не возьмут твои соперники!
                </p>
                <p className="mt-4 text-[clamp(1.16rem,2.1vw,2.05rem)] leading-[1.3] font-medium text-[var(--landing-body-copy)]">
                  Иначе придется поделить выигрыш с ними.
                </p>
              </CardContent>
            </Card>
            <Button
              className="mt-7 h-[50px] rounded-[10px] bg-gradient-to-r from-[#7D28F2] to-[#6320D8] px-8 text-[clamp(1rem,2.2vw,1.33rem)] font-medium text-white hover:from-[#8F3BFA] hover:to-[#722CE8]"
              onClick={onEnterLogin}
              type="button"
            >
              Войти в игру | от 1 ₽
            </Button>
          </div>
        </section>

        <MiniFooter />
      </div>
    </main>
  )
}
