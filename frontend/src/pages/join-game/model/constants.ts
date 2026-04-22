import { type Lobby } from './types'

export const LOBBIES: Lobby[] = [
  { id: 634101, creator: 'Андропов Михаил', players: '4 / 10', cost: '200', type: 'purple' },
  { id: 634102, creator: 'Александр Лисаев', players: '6 / 10', cost: '20 000', type: 'pink' },
  { id: 634103, creator: 'Дмитрий Чепутинов', players: '8 / 10', cost: '200 000', type: 'green' },
  { id: 634104, creator: 'Игорь Нефедов', players: '3 / 10', cost: '500', type: 'purple' },
  { id: 634105, creator: 'Роман Калягин', players: '5 / 10', cost: '3 000', type: 'pink' },
  { id: 634106, creator: 'Кирилл Зотов', players: '2 / 10', cost: '1 200', type: 'purple' },
  { id: 634107, creator: 'Артур Шубин', players: '7 / 10', cost: '40 000', type: 'pink' },
  { id: 634108, creator: 'Виктор Никитин', players: '9 / 10', cost: '90 000', type: 'green' },
  { id: 634109, creator: 'Глеб Савельев', players: '1 / 10', cost: '100', type: 'purple' },
  { id: 634110, creator: 'Тимур Ахмедов', players: '4 / 10', cost: '700', type: 'purple' },
  { id: 634111, creator: 'Максим Данилов', players: '6 / 10', cost: '12 000', type: 'pink' },
  { id: 634112, creator: 'Станислав Рощин', players: '8 / 10', cost: '160 000', type: 'green' },
  { id: 634113, creator: 'Павел Чередников', players: '3 / 10', cost: '1 000', type: 'purple' },
  { id: 634114, creator: 'Евгений Чернов', players: '5 / 10', cost: '8 000', type: 'pink' },
]

export const lobbyRowStyles: Record<Lobby['type'], string> = {
  purple: 'border-[#792DF6] bg-[rgba(55,31,86,0.88)]',
  pink: 'border-[#FF1493] bg-[rgba(81,28,62,0.88)]',
  green: 'border-[#ADE562] bg-[rgba(68,84,48,0.88)]',
}

export const tableGridClass =
  'grid grid-cols-[66px_minmax(130px,1.35fr)_minmax(86px,1fr)_minmax(102px,1fr)] md:grid-cols-[86px_minmax(180px,1.35fr)_minmax(122px,1fr)_minmax(140px,1fr)]'
