import { Dice5, Refrigerator, Swords } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Mechanic = {
  id: string
  name: string
  short: string
  description: string
  badge: string
  badgeBg: string
  /** Hero card gradient (bright). */
  heroFrom: string
  heroTo: string
  /** Soft page background tint (very low saturation pastel). */
  bgFrom: string
  bgTo: string
  /** Brand letter shown in the round logo. */
  letter: string
  available: boolean
  Icon: LucideIcon
}

export const MECHANICS: Mechanic[] = [
  {
    id: 'fridge',
    name: 'Ночной жор',
    short: 'Открой холодильник первым',
    description:
      'Быстрый раунд: до 6 игроков врываются в виртуальный холодильник. Кто схватит самое жирное блюдо — забирает фонд STL.',
    badge: 'HOT',
    badgeBg: 'bg-[#E5008C] text-white',
    heroFrom: '#FFD400',
    heroTo: '#FF8A00',
    bgFrom: '#FFF8E1',
    bgTo: '#FFEFD2',
    letter: 'Н',
    available: true,
    Icon: Refrigerator,
  },
  {
    id: 'wheel',
    name: 'Колесо удачи',
    short: 'Классический спин-раунд',
    description:
      'Колесо вращается, чем больше буст — тем больше сектор. В разработке: запуск в следующем спринте.',
    badge: 'СКОРО',
    badgeBg: 'bg-[#1666EC] text-white',
    heroFrom: '#1666EC',
    heroTo: '#0B3C9E',
    bgFrom: '#E6EFFF',
    bgTo: '#D9E6FB',
    letter: 'К',
    available: false,
    Icon: Dice5,
  },
  {
    id: 'duel',
    name: 'Дуэль карт',
    short: '1×1 битва на бонусы',
    description:
      'Два игрока, одна колода, всё решает один раунд. В разработке: проектируем матчмейкинг для дуэлей.',
    badge: 'СКОРО',
    badgeBg: 'bg-[#1AB75A] text-white',
    heroFrom: '#1AB75A',
    heroTo: '#0F7A3A',
    bgFrom: '#E6F8EE',
    bgTo: '#D4F0E0',
    letter: 'Д',
    available: false,
    Icon: Swords,
  },
]
