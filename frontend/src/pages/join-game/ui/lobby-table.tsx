import { Button } from '@shared/ui'
import { lobbyRowStyles, tableGridClass } from '../model/constants'
import type { Lobby } from '../model/types'

type LobbyTableProps = {
  lobbies: Lobby[]
  isJoining: boolean
  joinError: string
  onJoin: (lobbyId: number) => void
  onPickAffordable: () => void
}

export function LobbyTable({ lobbies, isJoining, joinError, onJoin, onPickAffordable }: LobbyTableProps) {
  return (
    <>
      <div
        className={`${tableGridClass} border-b border-[#333742] px-2 pb-3 text-[12px] text-[#9EA3B2] sm:px-3 sm:pt-2 sm:text-[14px]`}
      >
        <span>Номер</span>
        <span>Создатель</span>
        <span className="text-center">Число игроков</span>
        <span className="text-right">Начальная стоимость</span>
      </div>

      <div className="mt-3 h-[clamp(260px,46vh,520px)] overflow-y-auto pr-1 [scrollbar-color:#8A4BFF_#252A35] [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[linear-gradient(180deg,#8A4BFF_0%,#FF249C_100%)] [&::-webkit-scrollbar-thumb]:shadow-[0_0_0_1px_rgba(255,255,255,0.20)] [&::-webkit-scrollbar-thumb:hover]:bg-[linear-gradient(180deg,#9E67FF_0%,#FF49AE_100%)] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#252A35]/85 [&::-webkit-scrollbar-track]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] [&::-webkit-scrollbar]:w-2.5">
        <div className="flex flex-col gap-2.5">
          {lobbies.map((lobby) => (
            <button
              className={`${tableGridClass} items-center rounded-[14px] border px-3 py-2.5 text-[14px] text-[#F7F8FC] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-[1px] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8E45E] sm:px-4 sm:text-[15px] md:px-6 md:text-[16px] ${lobbyRowStyles[lobby.type]}`}
              key={lobby.id}
              disabled={isJoining}
              onClick={() => onJoin(lobby.id)}
              type="button"
            >
              <span>{lobby.id}</span>
              <span className="truncate font-semibold">{lobby.creator}</span>
              <span className="text-center font-semibold">{lobby.players}</span>
              <span className="text-right font-semibold">{lobby.cost}</span>
            </button>
          ))}
        </div>
      </div>

      {joinError ? (
        <div className="mt-3 rounded-[12px] border border-[#AA4242] bg-[#3A2020] px-3 py-2.5 text-[14px] text-[#FFD3D3]">
          <p>{joinError}</p>
          <Button
            className="mt-2 h-8 rounded-[8px] bg-[#A8E45E] px-3 text-[#101114] hover:bg-[#B8ED75]"
            onClick={onPickAffordable}
            type="button"
          >
            Подобрать дешевле
          </Button>
        </div>
      ) : null}
    </>
  )
}
