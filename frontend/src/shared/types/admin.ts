export type GetTemplateStatisticsRow = {
  completed_rooms: number
  total_real_players: number
  total_bots: number
  avg_real_players_per_room: number
}

export type GetBoostStatisticsRow = {
  total_boost_amount: number
  avg_boost_per_player: number
  avg_boost_per_room: number
}

export type GetWinnerStatisticsRow = {
  real_player_wins: number
  bot_wins: number
}

export type GetHistoricalMetricsRow = {
  avg_real_players_per_room: number
  avg_entry_cost: number
  total_completed_rooms: number
}
