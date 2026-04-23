export const routePaths = {
  root: "/",
  auth: "/auth",
  games: "/games",
  gamesCreate: "/games/create",
  gamesJoin: "/games/join",
  gamesLobby: "/games/lobby/:roomId",
  fridgeGame: "/games/fridge",
  admin: "/admin",
  adminTemplates: "/admin/templates",
  adminStats: "/admin/stats",
  adminStatsTemplate: "/admin/stats/:templateId",
} as const;

export function adminStatsTemplatePath(templateId: number): string {
  return `/admin/stats/${templateId}`
}

export function gamesLobbyPath(roomId: number): string {
  return `/games/lobby/${roomId}`
}
