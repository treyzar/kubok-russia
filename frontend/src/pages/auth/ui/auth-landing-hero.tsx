import { UserRound } from 'lucide-react'

import { Button } from '@/shared/ui/button'

type AuthLandingHeroProps = {
  onEnterLogin: () => void
}

export function AuthLandingHero({ onEnterLogin }: AuthLandingHeroProps) {
  const navItems = ['Об игре', 'Билеты', 'Архив тиражей']
  const animatedButtonBase = 'hero-btn'
  const winners = [
    {
      id: '932100',
      name: 'Денис Клещев',
      region: 'Москва',
      prize: '5 064 410 ₽',
      avatarPosition: '17% 30%',
    },
    {
      id: '730503',
      name: 'Юрий Штофа',
      region: 'Курганская область',
      prize: '4 843 700 ₽',
      avatarPosition: '49% 31%',
    },
    {
      id: '276019',
      name: 'Амир Леванов',
      region: 'Республика Алтай',
      prize: '4 909 000 ₽',
      avatarPosition: '80% 32%',
    },
  ]

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

        <section className="border-b border-[#232833] bg-[#0D0E12] px-4 py-10 sm:px-6 sm:py-12 lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-[1280px]">
            <h2 className="text-[clamp(2.25rem,4.9vw,3.55rem)] leading-[1.06] font-semibold text-[#F3F3F3]">
              Открываешь холодильник, а там...
            </h2>

            <div className="mt-8 space-y-8 sm:mt-10 sm:space-y-9 lg:mt-12 lg:space-y-10">
              <article className="grid items-center gap-6 lg:grid-cols-[49%_51%] lg:gap-9">
                <img
                  alt="Шаг 1: карточка с людьми"
                  className="w-full rounded-[16px] object-cover"
                  src="/dev-assets/images/card_with_peoples.svg"
                />

                <div>
                  <p className="text-[clamp(2rem,4.1vw,3.1rem)] leading-none font-semibold text-[#A8EA58] uppercase">Шаг 1</p>
                  <p className="mt-3 max-w-[30ch] text-[clamp(1.18rem,2.15vw,1.62rem)] leading-[1.32] font-medium text-[#F1F1F2]">
                    Создай своё лобби или войди в игру к другим участникам, ты будешь соревноваться с ними. Каждый из вас
                    отдаст одинаковую сумму в банк
                  </p>
                  <Button
                    className="mt-6 h-[42px] rounded-[8px] border border-[#272B34] !bg-[#111319] px-4 text-[16px] font-medium text-[#ECEDEF] opacity-85"
                    disabled
                    type="button"
                    variant="outline"
                  >
                    Заглушка
                  </Button>
                </div>
              </article>

              <article className="grid items-center gap-6 lg:grid-cols-[49%_51%] lg:gap-9">
                <div className="order-2 lg:order-1">
                  <p className="text-[clamp(2rem,4.1vw,3.1rem)] leading-none font-semibold text-[#A8EA58] uppercase">Шаг 2</p>
                  <p className="mt-3 max-w-[30ch] text-[clamp(1.18rem,2.15vw,1.62rem)] leading-[1.32] font-medium text-[#F1F1F2]">
                    Отметь ту часть холодильника, которая тебе приглянулась, там будет лежать ваш приз. При желании ты
                    можешь дать больше денег нашему Кубику, за это он может увеличить вам лот! Но ваши соперники также
                    могут сделать это!
                  </p>
                </div>

                <img
                  alt="Шаг 2: карточка с маскотом"
                  className="order-1 w-full rounded-[16px] object-cover lg:order-2"
                  src="/dev-assets/images/card_with_mascot.svg"
                />
              </article>

              <article className="grid items-center gap-6 lg:grid-cols-[49%_51%] lg:gap-9">
                <img
                  alt="Шаг 3: карточка с продуктами"
                  className="w-full rounded-[16px] object-cover"
                  src="/dev-assets/card_with_products.svg"
                />

                <div>
                  <p className="text-[clamp(2rem,4.1vw,3.1rem)] leading-none font-semibold text-[#A8EA58] uppercase">Шаг 3</p>
                  <p className="mt-3 max-w-[30ch] text-[clamp(1.18rem,2.15vw,1.62rem)] leading-[1.32] font-medium text-[#F1F1F2]">
                    Дверцы открываются, а за ними... ваши призы, в сумме равные всем банку! Но не забывайте, если на один
                    предмет положили глаз несколько игроков, то вы разделите его поровну между вами
                  </p>
                  <Button
                    className="mt-6 h-[42px] rounded-[8px] bg-[#EF2A92] px-6 text-[16px] font-medium text-[#F7F7F8] opacity-90 hover:bg-[#EF2A92]"
                    disabled
                    type="button"
                  >
                    Заглушка
                  </Button>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="border-b border-[#232833] bg-[#101318] px-5 py-9 sm:px-6 lg:px-7 lg:py-8">
          <div className="mx-auto w-full max-w-[1320px]">
            <h2 className="text-[clamp(2.35rem,4.5vw,3.35rem)] leading-[1.04] font-semibold text-[#F4F4F5]">
              Присоединяйся к чемпионам!
            </h2>

            <div className="mx-auto mt-1.5 h-[4px] w-[16px] rounded-full bg-[#EE2B9A]" />

            <div className="mt-6 grid gap-2.5 lg:grid-cols-2 lg:gap-2.5">
              <article className="relative rounded-[18px] bg-[#ABE362] px-6 pt-6 pb-5 sm:px-7 lg:min-h-[338px]">
                <div className="grid grid-cols-[1fr_auto] items-start gap-4">
                  <div>
                    <p className="text-[43px] leading-none font-semibold text-[#EDF6E7]">1/6</p>

                    <p className="mt-5 text-[17px] leading-none font-semibold text-[#191E25]">Сумма выигрыша</p>
                    <p className="mt-1.5 text-[42px] leading-none font-semibold text-[#F2F7ED]">2 896 700 ₽</p>

                    <p className="mt-5 text-[17px] leading-none font-semibold text-[#191E25]">Сумма общего банка</p>
                    <p className="mt-1.5 text-[42px] leading-none font-semibold text-[#F2F7ED]">5 000 000 ₽</p>

                    <p className="mt-5 text-[17px] leading-none font-semibold text-[#10141C]">Результаты игры</p>
                    <p className="mt-1.5 text-[41px] leading-none font-semibold text-[#090D14]">№310001</p>
                  </div>

                  <img
                    alt="Холодильник с блоками"
                    className="w-[172px] object-contain"
                    src="/dev-assets/images/fridge_with_blocks.svg"
                  />
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    aria-label="Предыдущий результат"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F4EA] text-[22px] font-semibold leading-none text-[#242730]"
                    disabled
                    type="button"
                  >
                    ←
                  </button>
                  <button
                    aria-label="Следующий результат"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F4EA] text-[22px] font-semibold leading-none text-[#242730]"
                    disabled
                    type="button"
                  >
                    →
                  </button>
                </div>
              </article>

              <article className="relative rounded-[18px] bg-[#ABE362] px-6 pt-6 pb-5 sm:px-7 lg:min-h-[338px]">
                <h3 className="text-[17px] leading-none font-semibold text-[#12171D]">Победители</h3>

                <div className="mt-7 space-y-6">
                  {winners.map((winner) => (
                    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3.5" key={winner.id}>
                      <div className="h-11 w-11 overflow-hidden rounded-full border border-[#D53395]/35 bg-[#F43A9E]">
                        <img
                          alt={winner.name}
                          className="h-full w-full object-cover"
                          src="/dev-assets/images/card_with_peoples.svg"
                          style={{ objectPosition: winner.avatarPosition }}
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[17px] leading-none font-semibold text-[#11161D]">{winner.name}</p>
                        <p className="mt-1 truncate text-[16px] leading-none font-medium text-[#4D573E]">{winner.region}</p>
                      </div>

                      <div className="text-right">
                        <p className="text-[15px] leading-none font-semibold text-[#4B5344]">Игра №{winner.id}</p>
                        <p className="mt-1 text-[15px] leading-none font-semibold text-[#10161E]">
                          {winner.prize}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <button
                    aria-label="Предыдущие победители"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F4EA] text-[22px] font-semibold leading-none text-[#242730]"
                    disabled
                    type="button"
                  >
                    ←
                  </button>
                  <button
                    aria-label="Следующие победители"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F4EA] text-[22px] font-semibold leading-none text-[#242730]"
                    disabled
                    type="button"
                  >
                    →
                  </button>
                </div>
              </article>
            </div>

            <div className="mx-auto mt-3 h-[4px] w-[16px] rounded-full bg-[#EE2B9A]" />
          </div>
        </section>

        <section className="border-b border-[#232833] bg-[#11141B] px-4 py-10 sm:px-6 sm:py-12 lg:px-12 lg:py-14">
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-8 lg:grid-cols-[45%_55%] lg:gap-10">
            <div className="relative h-[320px] sm:h-[360px] lg:h-[382px]">
              <div className="pointer-events-none absolute left-[6%] top-[63%] h-[240px] w-[240px] -translate-y-1/2 rounded-full bg-[#A2C8FF]/20 blur-[54px]" />
              <div className="pointer-events-none absolute left-[37%] top-[32%] h-[260px] w-[260px] -translate-y-1/2 rounded-full bg-[#BFD8FF]/24 blur-[58px]" />

              <img
                alt="Кубик маскот 1"
                className="absolute left-[7%] top-[57%] w-[138px] -translate-y-1/2 object-contain sm:w-[156px] lg:w-[174px]"
                src="/dev-assets/images/mascot_1.svg"
              />
              <img
                alt="Кубик маскот 2"
                className="absolute left-[40%] top-[18%] w-[142px] object-contain sm:w-[160px] lg:w-[182px]"
                src="/dev-assets/images/mascot_2.svg"
              />
            </div>

            <div className="lg:pr-1">
              <h2 className="max-w-[11ch] text-[clamp(2.25rem,4.3vw,3.25rem)] leading-[1.03] font-semibold text-[#F3F3F3]">
                Раскрой свой талант предугадывания
              </h2>

              <div className="mt-6 rounded-[14px] border border-[#313744] px-4 py-4 sm:px-6 sm:py-5">
                <p className="text-[clamp(1.9rem,2.7vw,2.05rem)] leading-[1.22] font-medium text-[#ECEEF1]">
                  Постарайся выбрать именно то, что не возьмут твои соперники!
                </p>
                <p className="mt-4 text-[clamp(1.9rem,2.7vw,2.05rem)] leading-[1.22] font-medium text-[#ECEEF1]">
                  Иначе придется поделить выигрыш с ними.
                </p>
              </div>

              <Button
                className="mt-7 h-[50px] min-w-[250px] rounded-[10px] bg-gradient-to-r from-[#7D28F2] to-[#6320D8] px-8 text-[33px] font-medium text-white hover:from-[#8F3BFA] hover:to-[#722CE8]"
                onClick={onEnterLogin}
                type="button"
              >
                Войти в игру | от 1 ₽
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
