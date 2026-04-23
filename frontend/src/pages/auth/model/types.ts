import type { CSSProperties } from 'react'

export type LandingTheme = 'dark' | 'light'

export type ChampionWinner = {
  id: string
  name: string
  region: string
  prize: string
  avatarPosition: string
}

export type ChampionCardVariant = {
  round: string
  prizeSum: string
  bankSum: string
  gameNo: string
  activeSlotIds: number[]
  winners: ChampionWinner[]
}

export type LandingStep = {
  title: string
  text: string
  image: string
  alt: string
  cta: string
}

export type FridgeSlot = {
  id: number
  top: string
  left: string
  active?: boolean
}

export type ThemeVars = CSSProperties

export type AuthLandingHeroProps = {
  onEnterLogin: () => void
}