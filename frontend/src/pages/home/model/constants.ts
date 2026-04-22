import { type LastGameItem, type NewsSlideItem } from './types'

export const lastGames: LastGameItem[] = [
  {
    id: '634010',
    title: 'Игра №634010',
    amount: '+30 110 ₽',
    amountColor: 'text-[#25D347]',
    image: '/dev-assets/images/caviar.svg',
    bg: 'bg-[#5C2DFF]',
  },
  {
    id: '620341',
    title: 'Игра №620341',
    amount: '-110 ₽',
    amountColor: 'text-[#FF4040]',
    image: '/dev-assets/images/sausage.svg',
    bg: 'bg-[#FF1493]',
  },
  {
    id: '619934',
    title: 'Игра №619934',
    amount: '+7 256 ₽',
    amountColor: 'text-[#25D347]',
    image: '/dev-assets/images/vino.svg',
    bg: 'bg-[#A7E35D]',
  },
  {
    id: '592006',
    title: 'Игра №592006',
    amount: '+156 ₽',
    amountColor: 'text-[#25D347]',
    image: '/dev-assets/images/icecream.svg',
    bg: 'bg-[#6E27F2]',
  },
  {
    id: '589941',
    title: 'Игра №589941',
    amount: '+1 256 ₽',
    amountColor: 'text-[#25D347]',
    image: '/dev-assets/images/cheese.svg',
    bg: 'bg-[#FF2A1A]',
  },
]

export const newsSlides: NewsSlideItem[] = [
  {
    id: 'coupon',
    image: '/dev-assets/images/default.svg',
    alt: 'Новостной баннер с акцией',
  },
  {
    id: 'winners',
    image: '/dev-assets/images/variant_1.svg',
    alt: 'Новостной баннер с победителями',
  },
  {
    id: 'fridge',
    image: '/dev-assets/images/variant_3.svg',
    alt: 'Новостной баннер с игровым холодильником',
  },
]

export const NEWS_AUTOPLAY_MS = 4200
export const NEWS_MANUAL_PAUSE_MS = 5000
export const NEWS_SLIDE_TRANSITION_MS = 860
