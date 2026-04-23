import { type Lobby } from './types'

export type LobbySort = 'recommended' | 'price-asc' | 'price-desc' | 'seats-asc'
export type LobbyPriceFilter = 'any' | 'cheap' | 'medium' | 'high'
export type LobbySeatsFilter = 'any' | 'small' | 'mid' | 'large'

export function parseLobbyCost(value: string): number {
  return Number(value.replace(/\s+/g, ''))
}

export function parseLobbySeats(value: string): number {
  const [, total] = value.split('/')
  return Number(total?.trim() ?? 0)
}

export function matchesPriceFilter(cost: number, filter: LobbyPriceFilter): boolean {
  if (filter === 'cheap') {
    return cost <= 1000
  }
  if (filter === 'medium') {
    return cost > 1000 && cost <= 15000
  }
  if (filter === 'high') {
    return cost > 15000
  }
  return true
}

export function matchesSeatsFilter(seats: number, filter: LobbySeatsFilter): boolean {
  if (filter === 'small') {
    return seats <= 3
  }
  if (filter === 'mid') {
    return seats >= 4 && seats <= 6
  }
  if (filter === 'large') {
    return seats >= 7
  }
  return true
}

export function sortLobbies(lobbies: Lobby[], sort: LobbySort): Lobby[] {
  const copy = [...lobbies]
  if (sort === 'price-asc') {
    return copy.sort((a, b) => parseLobbyCost(a.cost) - parseLobbyCost(b.cost))
  }
  if (sort === 'price-desc') {
    return copy.sort((a, b) => parseLobbyCost(b.cost) - parseLobbyCost(a.cost))
  }
  if (sort === 'seats-asc') {
    return copy.sort((a, b) => parseLobbySeats(a.players) - parseLobbySeats(b.players))
  }
  return copy.sort((a, b) => parseLobbyCost(a.cost) - parseLobbyCost(b.cost))
}
