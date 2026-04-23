export type User = {
  id: number
  name: string
  balance: number
  created_at: string
}

export type BotRow = {
  id: number
  name: string
  balance: number
}

export type UpdateBalanceDeltaBody = {
  delta: number
}

export type BalanceAmountBody = {
  amount: number
}

export type SetBalanceBody = {
  balance: number
}

export type UsersResponse = { users: User[] }
