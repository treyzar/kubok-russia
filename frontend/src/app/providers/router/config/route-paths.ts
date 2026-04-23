export const routePaths = {
  root: "/",
  auth: "/auth",
  games: "/games",
  gamesCreate: "/games/create",
  gamesJoin: "/games/join",
  gamesLobby: "/games/lobby/:roomId",
  fridgeGame: "/games/fridge",
} as const;

export function gamesLobbyPath(roomId: number): string {
  return `/games/lobby/${roomId}`
}
