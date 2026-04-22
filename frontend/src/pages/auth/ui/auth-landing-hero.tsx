import { memo, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowLeft, ArrowRight, UserRound } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, CardContent, CardHeader, CardTitle, MiniFooter, Separator, Switch } from '@shared/ui'

type AuthLandingHeroProps = {
  onEnterLogin: () => void
}

type LandingTheme = 'dark' | 'light'

const navItems = ['Об игре', 'Билеты', 'Архив тиражей']

const steps = [
  {
    title: 'Шаг 1',
    text: 'Создай своё лобби или войди в игру к другим участникам. Каждый из вас вносит одинаковую сумму в банк.',
    image: '/dev-assets/images/card_with_peoples.svg',
    alt: 'Шаг 1: карточка с участниками',
    cta: 'Заглушка',
  },
  {
    title: 'Шаг 2',
    text: 'Выбери понравившуюся часть холодильника. Чем больше вклад в Кубик, тем выше шанс на усиленный лот.',
    image: '/dev-assets/images/card_with_mascot.svg',
    alt: 'Шаг 2: карточка с маскотом',
    cta: '',
  },
  {
    title: 'Шаг 3',
    text: 'После открытия дверей призы распределяются. Если на один предмет несколько игроков, приз делится поровну.',
    image: '/dev-assets/card_with_products.svg',
    alt: 'Шаг 3: карточка с продуктами',
    cta: 'Заглушка',
  },
]

type ChampionWinner = {
  id: string
  name: string
  region: string
  prize: string
  avatarPosition: string
}

type ChampionCardVariant = {
  round: string
  prizeSum: string
  bankSum: string
  gameNo: string
  activeSlotIds: number[]
  winners: ChampionWinner[]
}

const championVariants: ChampionCardVariant[] = [
  {
    round: '1/6',
    prizeSum: '2 896 700 ₽',
    bankSum: '5 000 000 ₽',
    gameNo: '№310001',
    activeSlotIds: [5, 8],
    winners: [
      { id: '932100', name: 'Денис Клещев', region: 'Москва', prize: '5 064 410 ₽', avatarPosition: '17% 30%' },
      { id: '730503', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 843 700 ₽', avatarPosition: '49% 31%' },
      { id: '276019', name: 'Амир Леванов', region: 'Республика Алтай', prize: '4 909 000 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '2/6',
    prizeSum: '3 102 450 ₽',
    bankSum: '5 200 000 ₽',
    gameNo: '№310002',
    activeSlotIds: [1, 7],
    winners: [
      { id: '932101', name: 'Денис Клещев', region: 'Москва', prize: '4 734 900 ₽', avatarPosition: '17% 30%' },
      { id: '730504', name: 'Юрий Штофа', region: 'Курганская область', prize: '5 010 250 ₽', avatarPosition: '49% 31%' },
      { id: '276020', name: 'Амир Леванов', region: 'Республика Алтай', prize: '4 621 300 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '3/6',
    prizeSum: '2 745 300 ₽',
    bankSum: '4 900 000 ₽',
    gameNo: '№310003',
    activeSlotIds: [3, 9],
    winners: [
      { id: '932102', name: 'Денис Клещев', region: 'Москва', prize: '4 988 700 ₽', avatarPosition: '17% 30%' },
      { id: '730505', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 802 100 ₽', avatarPosition: '49% 31%' },
      { id: '276021', name: 'Амир Леванов', region: 'Республика Алтай', prize: '5 101 500 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '4/6',
    prizeSum: '3 455 800 ₽',
    bankSum: '5 600 000 ₽',
    gameNo: '№310004',
    activeSlotIds: [2, 6],
    winners: [
      { id: '932103', name: 'Денис Клещев', region: 'Москва', prize: '5 211 400 ₽', avatarPosition: '17% 30%' },
      { id: '730506', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 592 800 ₽', avatarPosition: '49% 31%' },
      { id: '276022', name: 'Амир Леванов', region: 'Республика Алтай', prize: '4 980 000 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '5/6',
    prizeSum: '2 980 200 ₽',
    bankSum: '5 150 000 ₽',
    gameNo: '№310005',
    activeSlotIds: [4, 10],
    winners: [
      { id: '932104', name: 'Денис Клещев', region: 'Москва', prize: '4 870 220 ₽', avatarPosition: '17% 30%' },
      { id: '730507', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 931 700 ₽', avatarPosition: '49% 31%' },
      { id: '276023', name: 'Амир Леванов', region: 'Республика Алтай', prize: '5 040 000 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '6/6',
    prizeSum: '3 220 900 ₽',
    bankSum: '5 450 000 ₽',
    gameNo: '№310006',
    activeSlotIds: [5, 8],
    winners: [
      { id: '932105', name: 'Денис Клещев', region: 'Москва', prize: '5 120 900 ₽', avatarPosition: '17% 30%' },
      { id: '730508', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 744 500 ₽', avatarPosition: '49% 31%' },
      { id: '276024', name: 'Амир Леванов', region: 'Республика Алтай', prize: '4 996 300 ₽', avatarPosition: '80% 32%' },
    ],
  },
]


const fridgeSlots = [
  { id: 1, top: '12.5%', left: '27.5%' },
  { id: 6, top: '12.5%', left: '74.5%' },
  { id: 2, top: '28.5%', left: '27.5%' },
  { id: 7, top: '28.5%', left: '74.5%' },
  { id: 3, top: '44.5%', left: '27.5%' },
  { id: 8, top: '44.5%', left: '74.5%', active: true },
  { id: 4, top: '66.5%', left: '27.5%' },
  { id: 9, top: '66.5%', left: '74.5%' },
  { id: 5, top: '82.5%', left: '27.5%', active: true },
  { id: 10, top: '82.5%', left: '74.5%' },
]

const darkThemeVars = {
  '--landing-bg': '#0D0F14',
  '--landing-surface': '#121720',
  '--landing-section-bg': '#101318',
  '--landing-muted-surface': '#11141B',
  '--landing-border': 'rgba(255, 255, 255, 0.08)',
  '--landing-text': '#F2F4F7',
  '--landing-text-soft': '#F4F6FA',
  '--landing-text-muted': '#DCE2EC',
  '--landing-text-subtle': '#A8B4C6',
  '--landing-divider': 'rgba(255, 255, 255, 0.12)',
  '--landing-card-green': '#ABE362',
  '--landing-card-title': '#12171D',
  '--landing-card-sub': '#4D573E',
  '--landing-card-muted': '#4B5344',
  '--landing-card-ctrl': '#F1F4EA',
  '--landing-step-accent': '#A8EA58',
  '--landing-step-text': '#EFF1F4',
  '--landing-secondary-bg': '#2C1026',
  '--landing-secondary-border': '#B6178A',
  '--landing-outline': '#313744',
  '--landing-body-copy': '#ECEEF1',
  '--landing-hero-accent': '#B5EA69',
  '--landing-champ-bg': '#121417',
  '--landing-champ-card': '#A9DF63',
  '--landing-champ-title': '#0D1117',
  '--landing-champ-sub': '#4D5E38',
  '--landing-champ-muted': '#597041',
  '--landing-champ-ctrl': '#F4F6EF',
} as CSSProperties

const lightThemeVars = {
  '--landing-bg': '#F4F7FC',
  '--landing-surface': '#FFFFFF',
  '--landing-section-bg': '#EEF3FA',
  '--landing-muted-surface': '#EAF0F8',
  '--landing-border': 'rgba(15, 23, 42, 0.12)',
  '--landing-text': '#172131',
  '--landing-text-soft': '#1D2A3D',
  '--landing-text-muted': '#475569',
  '--landing-text-subtle': '#5B6C84',
  '--landing-divider': 'rgba(15, 23, 42, 0.18)',
  '--landing-card-green': '#C8EFA0',
  '--landing-card-title': '#1D2D11',
  '--landing-card-sub': '#4D6238',
  '--landing-card-muted': '#516440',
  '--landing-card-ctrl': '#FFFFFF',
  '--landing-step-accent': '#5D9E1B',
  '--landing-step-text': '#2A3342',
  '--landing-secondary-bg': '#FCE9F5',
  '--landing-secondary-border': '#C2268F',
  '--landing-outline': '#C7D3E6',
  '--landing-body-copy': '#273549',
  '--landing-hero-accent': '#5A981A',
  '--landing-champ-bg': '#EAF0FA',
  '--landing-champ-card': '#BFEA82',
  '--landing-champ-title': '#13200E',
  '--landing-champ-sub': '#3E5631',
  '--landing-champ-muted': '#4A6738',
  '--landing-champ-ctrl': '#FFFFFF',
} as CSSProperties

function ThemeToggle({ theme, onToggle }: { theme: LandingTheme; onToggle: () => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--landing-border)] bg-[var(--landing-muted-surface)] px-2.5 py-2 sm:px-3">
      <Switch checked={theme === 'light'} className="h-6 w-11" onCheckedChange={onToggle} />
      <Badge
        className="rounded-[8px] border border-transparent bg-transparent px-1.5 text-[0.83rem] font-semibold text-[var(--landing-text)] sm:text-[0.92rem]"
        variant="outline"
      >
        {theme === 'dark' ? 'Светлая' : 'Тёмная'}
      </Badge>
    </div>
  )
}

function ChampionNavButtons({
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  disabled,
}: {
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  disabled?: boolean
}) {
  return (
    <div className="absolute bottom-6 left-6 flex items-center gap-3">
      <Button
        aria-label={prevLabel}
        className="h-11 w-11 rounded-full bg-[var(--landing-champ-ctrl)] p-0 text-[#151A20] hover:bg-[var(--landing-champ-ctrl)]/90"
        disabled={disabled}
        onClick={onPrev}
        type="button"
        variant="ghost"
      >
        <ArrowLeft className="size-6" />
      </Button>
      <Button
        aria-label={nextLabel}
        className="h-11 w-11 rounded-full bg-[var(--landing-champ-ctrl)] p-0 text-[#151A20] hover:bg-[var(--landing-champ-ctrl)]/90"
        disabled={disabled}
        onClick={onNext}
        type="button"
        variant="ghost"
      >
        <ArrowRight className="size-6" />
      </Button>
    </div>
  )
}

const winnersVariants: ChampionWinner[][] = [
  [
    { id: '842120', name: 'Никита Воронов', region: 'Москва', prize: '5 064 410 ₽', avatarPosition: '17% 30%' },
    { id: '715903', name: 'Артём Киселёв', region: 'Курганская область', prize: '4 843 700 ₽', avatarPosition: '49% 31%' },
    { id: '291019', name: 'Руслан Хасанов', region: 'Республика Алтай', prize: '4 909 000 ₽', avatarPosition: '80% 32%' },
  ],
  [
    { id: '842121', name: 'Михаил Савельев', region: 'Санкт-Петербург', prize: '4 990 300 ₽', avatarPosition: '17% 30%' },
    { id: '715904', name: 'Даниил Прохоров', region: 'Пермский край', prize: '5 041 100 ₽', avatarPosition: '49% 31%' },
    { id: '291020', name: 'Тимур Гасанов', region: 'Республика Дагестан', prize: '4 801 550 ₽', avatarPosition: '80% 32%' },
  ],
  [
    { id: '842122', name: 'Егор Фролов', region: 'Воронеж', prize: '4 912 800 ₽', avatarPosition: '17% 30%' },
    { id: '715905', name: 'Илья Мартынов', region: 'Самарская область', prize: '5 118 240 ₽', avatarPosition: '49% 31%' },
    { id: '291021', name: 'Роман Басыров', region: 'Республика Башкортостан', prize: '4 760 330 ₽', avatarPosition: '80% 32%' },
  ],
  [
    { id: '842123', name: 'Сергей Макаров', region: 'Ярославль', prize: '5 205 900 ₽', avatarPosition: '17% 30%' },
    { id: '715906', name: 'Павел Ершов', region: 'Тюменская область', prize: '4 671 200 ₽', avatarPosition: '49% 31%' },
    { id: '291022', name: 'Азамат Юсупов', region: 'Республика Татарстан', prize: '4 954 890 ₽', avatarPosition: '80% 32%' },
  ],
  [
    { id: '842124', name: 'Владимир Крылов', region: 'Нижний Новгород', prize: '4 845 760 ₽', avatarPosition: '17% 30%' },
    { id: '715907', name: 'Алексей Корнеев', region: 'Оренбургская область', prize: '5 037 420 ₽', avatarPosition: '49% 31%' },
    { id: '291023', name: 'Булат Исхаков', region: 'Уфа', prize: '4 982 000 ₽', avatarPosition: '80% 32%' },
  ],
  [
    { id: '842125', name: 'Константин Лебедев', region: 'Краснодар', prize: '5 147 600 ₽', avatarPosition: '17% 30%' },
    { id: '715908', name: 'Антон Громов', region: 'Новосибирск', prize: '4 732 880 ₽', avatarPosition: '49% 31%' },
    { id: '291024', name: 'Эльдар Сафин', region: 'Казань', prize: '5 006 140 ₽', avatarPosition: '80% 32%' },
  ],
]

const RightWinnersCard = memo(function RightWinnersCard() {
  const [variantIndex, setVariantIndex] = useState(0)
  const [isSwitchingVariant, setIsSwitchingVariant] = useState(false)
  const switchTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (switchTimerRef.current !== null) {
        window.clearTimeout(switchTimerRef.current)
      }
    }
  }, [])

  function handleSwitchVariant(direction: -1 | 1): void {
    if (isSwitchingVariant) {
      return
    }

    const nextIndex = (variantIndex + direction + winnersVariants.length) % winnersVariants.length
    setIsSwitchingVariant(true)

    switchTimerRef.current = window.setTimeout(() => {
      setVariantIndex(nextIndex)
      setIsSwitchingVariant(false)
      switchTimerRef.current = null
    }, 180)
  }

  const activeWinners = winnersVariants[variantIndex]

  return (
    <Card className="relative h-[488px] rounded-[20px] border-transparent bg-[var(--landing-champ-card)] shadow-none">
      <CardHeader className="px-6 py-6 pb-0 sm:px-7 sm:pt-7">
        <CardTitle className="text-[clamp(1.8rem,2.9vw,2.55rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
          Победители
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col px-6 pb-24 pt-3 sm:px-7">
        <div
          className={`flex flex-1 items-center -translate-y-4 transition-all duration-300 sm:-translate-y-5 lg:-translate-y-6 ${
            isSwitchingVariant ? 'translate-x-1 opacity-0' : 'translate-x-0 opacity-100'
          }`}
        >
          <div className="w-full space-y-6">
            {activeWinners.map((winner) => (
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5" key={winner.id}>
                <Avatar className="h-11 w-11 border-2 border-[#F52C9C] bg-[#F43A9E]">
                  <AvatarImage
                    alt={winner.name}
                    className="object-cover"
                    src="/dev-assets/images/card_with_peoples.svg"
                    style={{ objectPosition: winner.avatarPosition }}
                  />
                  <AvatarFallback className="bg-[#F43A9E] text-[0.62rem] font-semibold text-white">
                    {winner.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[clamp(1.2rem,1.9vw,1.75rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
                    {winner.name}
                  </p>
                  <p className="mt-1.5 truncate text-[clamp(1rem,1.6vw,1.45rem)] leading-none font-medium text-[var(--landing-champ-sub)]">
                    {winner.region}
                  </p>
                </div>
                <div className="min-w-[155px] text-right">
                  <p className="text-[clamp(1rem,1.5vw,1.3rem)] leading-none font-semibold text-[var(--landing-champ-muted)]">
                    Игра №{winner.id}
                  </p>
                  <p className="mt-1.5 text-[clamp(1.2rem,1.85vw,1.65rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
                    {winner.prize}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ChampionNavButtons
          disabled={isSwitchingVariant}
          nextLabel="Следующие победители"
          onNext={() => handleSwitchVariant(1)}
          onPrev={() => handleSwitchVariant(-1)}
          prevLabel="Предыдущие победители"
        />
      </CardContent>
    </Card>
  )
})


export function AuthLandingHero({ onEnterLogin }: AuthLandingHeroProps) {
  const [theme, setTheme] = useState<LandingTheme>(() => {
    if (typeof window === 'undefined') {
      return 'dark'
    }
    const storedTheme = window.localStorage.getItem('landing-theme')
    return storedTheme === 'light' ? 'light' : 'dark'
  })

  useEffect(() => {
    window.localStorage.setItem('landing-theme', theme)
  }, [theme])

  const [variantIndex, setVariantIndex] = useState(0)
  const [isSwitchingVariant, setIsSwitchingVariant] = useState(false)
  const switchTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (switchTimerRef.current !== null) {
        window.clearTimeout(switchTimerRef.current)
      }
    }
  }, [])

  function handleSwitchVariant(direction: -1 | 1): void {
    if (isSwitchingVariant) {
      return
    }

    const nextIndex = (variantIndex + direction + championVariants.length) % championVariants.length
    setIsSwitchingVariant(true)

    switchTimerRef.current = window.setTimeout(() => {
      setVariantIndex(nextIndex)
      setIsSwitchingVariant(false)
      switchTimerRef.current = null
    }, 180)
  }

  const activeVariant = championVariants[variantIndex]
  const activeSlots = new Set(activeVariant.activeSlotIds)

  return (
    <main className="min-h-svh w-full overflow-x-clip bg-[var(--landing-bg)] text-[var(--landing-text)]" style={theme === 'light' ? lightThemeVars : darkThemeVars}>
      <div className="w-full">
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
              {navItems.map((item) => (
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
              <ThemeToggle
                onToggle={() => {
                  setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
                }}
                theme={theme}
              />

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

        <section className="w-full border-b border-[var(--landing-border)] bg-[var(--landing-bg)] px-5 py-12 sm:px-7 lg:px-10 lg:py-14">
          <h2 className="text-[clamp(2rem,4.3vw,3.3rem)] leading-[1.05] font-semibold text-[var(--landing-text-soft)]">
            Открываешь холодильник, а там...
          </h2>

          <div className="mt-10 space-y-10">
            {steps.map((step, index) => {
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

        <section className="w-full border-b border-[var(--landing-border)] bg-[var(--landing-champ-bg)] px-5 py-10 sm:px-7 lg:px-10 lg:py-12">
          <h2 className="text-[clamp(2.45rem,5.2vw,4rem)] leading-[1.02] font-semibold text-[var(--landing-text-soft)]">
            Присоединяйся к чемпионам!
          </h2>

          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <Card className="relative h-[488px] overflow-hidden rounded-[20px] border-transparent bg-[var(--landing-champ-card)] shadow-none">
              <CardContent className="flex h-full flex-col px-6 py-6 pb-24 sm:px-7 sm:py-7">
                <div
                  className={`grid h-full grid-cols-[1fr_150px] items-start gap-0 transition-all duration-300 sm:grid-cols-[1fr_170px] lg:grid-cols-[1fr_205px] ${
                    isSwitchingVariant ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'
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
                      {fridgeSlots.map((slot) => (
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
                  disabled={isSwitchingVariant}
                  nextLabel="Следующий результат"
                  onNext={() => handleSwitchVariant(1)}
                  onPrev={() => handleSwitchVariant(-1)}
                  prevLabel="Предыдущий результат"
                />
              </CardContent>
            </Card>

            <RightWinnersCard />
          </div>
        </section>

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
              className="absolute left-[40%] top-[18%] w-[142px] object-contain sm:w-[160px] lg:w-[182px]"
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
