import { BadgePercent, Dot, Sparkles, Zap } from 'lucide-react'

import { type AuthUser } from '@/features/mock-auth/model/mock-auth'
import { RoomShell, useRoomMockStore } from '@/features/room-menu'

type HomePageProps = {
  user: AuthUser
  onLogout: () => void
}

const trainSprites = [
  '/dev-assets/images/train.svg',
  '/dev-assets/images/train_2.svg',
  '/dev-assets/images/train_3.svg',
  '/dev-assets/images/train_4.svg',
  '/dev-assets/images/train_5.svg',
]

export function HomePage({ user, onLogout }: HomePageProps) {
  const store = useRoomMockStore({
    user,
    onLeaveRoom: onLogout,
  })

  return (
    <RoomShell
      actions={store.actions}
      boost={store.boost}
      currentBalance={store.currentBalance}
      errorMessage={store.errorMessage}
      participants={store.participants}
      room={store.room}
      selectedParticipantId={store.selectedParticipantId}
      timeline={store.timeline}
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-[#40495A] bg-[#131926] px-3 py-1.5 text-xs text-[#CBD5E1]">
            <Sparkles size={13} />
            Универсальный canvas для игр
          </p>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#40495A] bg-[#131926] px-3 py-1.5 text-xs text-[#CBD5E1]">
            <BadgePercent size={13} />
            Вероятности синхронны с бустом
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {trainSprites.map((sprite, index) => {
            const participant = store.participants[index]
            const selected = participant ? participant.id === store.selectedParticipantId : false
            return (
              <button
                className={`overflow-hidden rounded-xl border p-2 text-left transition ${
                  selected ? 'border-[#FFE129] bg-[#2A2B19]' : 'border-[#3A4250] bg-[#0F141C] hover:border-[#667288]'
                }`}
                key={sprite}
                onClick={() => {
                  if (participant) {
                    store.actions.selectParticipant(participant.id)
                  }
                }}
                type="button"
              >
                <img alt={`Визуал раунда ${index + 1}`} className="h-24 w-full object-contain" src={sprite} />
                <p className="mt-1 text-xs text-[#AAB7C9]">Слот визуала #{index + 1}</p>
              </button>
            )
          })}
        </div>

        <div className="mt-4 rounded-xl border border-[#3A4250] bg-[#10151E] p-3">
          <p className="text-xs text-[#9FB0C8]">Текущий выбранный участник</p>
          <p className="mt-1 text-sm font-medium text-[#EDF2F9]">
            {store.participants.find((item) => item.id === store.selectedParticipantId)?.name ?? 'Никто не выбран'}
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-[#B7C5D8]">
            <Zap size={12} />
            Этот блок можно заменить на любую real-time игру без изменения RoomShell.
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-[#9FB0C8]">
            <Dot size={12} />
            Деморежим работает полностью на моковых данных.
          </p>
        </div>
      </div>
    </RoomShell>
  )
}
