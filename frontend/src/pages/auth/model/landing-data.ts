import type { ChampionCardVariant, ChampionWinner, FridgeSlot, LandingStep, ThemeVars } from './types'

export const NAV_ITEMS = ['Об игре', 'Билеты', 'Архив тиражей'] as const

export const LANDING_STEPS: LandingStep[] = [
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

export const FRIDGE_SLOTS: FridgeSlot[] = [
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

export const DARK_THEME_VARS: ThemeVars = {
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
}

export const LIGHT_THEME_VARS: ThemeVars = {
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
}

export const CHAMPION_VARIANTS: ChampionCardVariant[] = [
  {
    round: '1/6', prizeSum: '2 896 700 ₽', bankSum: '5 000 000 ₽', gameNo: '№310001', activeSlotIds: [5, 8],
    winners: [
      { id: '932100', name: 'Денис Клещев', region: 'Москва', prize: '5 064 410 ₽', avatarPosition: '17% 30%' },
      { id: '730503', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 843 700 ₽', avatarPosition: '49% 31%' },
      { id: '276019', name: 'Амир Леванов', region: 'Республика Алтай', prize: '4 909 000 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '2/6', prizeSum: '3 102 450 ₽', bankSum: '5 200 000 ₽', gameNo: '№310002', activeSlotIds: [1, 7],
    winners: [
      { id: '932101', name: 'Денис Клещев', region: 'Москва', prize: '4 734 900 ₽', avatarPosition: '17% 30%' },
      { id: '730504', name: 'Юрий Штофа', region: 'Курганская область', prize: '5 010 250 ₽', avatarPosition: '49% 31%' },
      { id: '276020', name: 'Амир Леванов', region: 'Республика Алтай', prize: '4 621 300 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '3/6', prizeSum: '2 745 300 ₽', bankSum: '4 900 000 ₽', gameNo: '№310003', activeSlotIds: [3, 9],
    winners: [
      { id: '932102', name: 'Денис Клещев', region: 'Москва', prize: '4 988 700 ₽', avatarPosition: '17% 30%' },
      { id: '730505', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 802 100 ₽', avatarPosition: '49% 31%' },
      { id: '276021', name: 'Амир Леванов', region: 'Республика Алтай', prize: '5 101 500 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '4/6', prizeSum: '3 455 800 ₽', bankSum: '5 600 000 ₽', gameNo: '№310004', activeSlotIds: [2, 6],
    winners: [
      { id: '932103', name: 'Денис Клещев', region: 'Москва', prize: '5 211 400 ₽', avatarPosition: '17% 30%' },
      { id: '730506', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 592 800 ₽', avatarPosition: '49% 31%' },
      { id: '276022', name: 'Амир Леванов', region: 'Республика Алтай', prize: '4 980 000 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '5/6', prizeSum: '2 980 200 ₽', bankSum: '5 150 000 ₽', gameNo: '№310005', activeSlotIds: [4, 10],
    winners: [
      { id: '932104', name: 'Денис Клещев', region: 'Москва', prize: '4 870 220 ₽', avatarPosition: '17% 30%' },
      { id: '730507', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 931 700 ₽', avatarPosition: '49% 31%' },
      { id: '276023', name: 'Амир Леванов', region: 'Республика Алтай', prize: '5 040 000 ₽', avatarPosition: '80% 32%' },
    ],
  },
  {
    round: '6/6', prizeSum: '3 220 900 ₽', bankSum: '5 450 000 ₽', gameNo: '№310006', activeSlotIds: [5, 8],
    winners: [
      { id: '932105', name: 'Денис Клещев', region: 'Москва', prize: '5 120 900 ₽', avatarPosition: '17% 30%' },
      { id: '730508', name: 'Юрий Штофа', region: 'Курганская область', prize: '4 744 500 ₽', avatarPosition: '49% 31%' },
      { id: '276024', name: 'Амир Леванов', region: 'Республика Алтай', prize: '4 996 300 ₽', avatarPosition: '80% 32%' },
    ],
  },
]

export const WINNERS_VARIANTS: ChampionWinner[][] = [
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
