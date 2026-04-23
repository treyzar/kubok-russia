export type ApiError = {
  title: string
  status: number
  detail: string
}

export type InsufficientFundsError = ApiError & {
  errors: {
    message: string
    required: number
    current_balance: number
    shortfall: number
  }
}
