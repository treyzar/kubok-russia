import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AuthUser } from '@entities/user'

import type {
  BoostState,
  ParticipantOdds,
  RoomActions,
  RoomConfig,
  RoomState,
  RoundPhase,
  RoundHistoryItem,
  RoundTimelineEvent,
} from './types'

type UseRoomMockStoreParams = {
  user: AuthUser
  onLeaveRoom: () => void
}

type UseRoomMockStoreResult = {
  room: RoomState
  roomConfig: RoomConfig
  participants: ParticipantOdds[]
  boost: BoostState
  timeline: RoundTimelineEvent[]
  roundHistory: RoundHistoryItem[]
  currentBalance: number
  selectedParticipantId: string | null
  errorMessage: string
  actions: RoomActions
}

type InternalParticipant = {
  id: string
  name: string
  isBot: boolean
  seat: number
  weight: number
  boostPoints: number
  isCurrentUser: boolean
}

const DEFAULT_CONFIG: RoomConfig = {
  seatsTotal: 10,
  entryCost: 500,
  prizeFundPercent: 82,
  boostPrice: 300,
}

const BOOST_WEIGHT = 20
const COUNTDOWN_SECONDS = 12
const PLAYING_SECONDS = 10

function nowLabel(): string {
  return new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function toPhaseText(phase: RoundPhase): string {
  switch (phase) {
    case 'waiting':
      return 'Ожидание входа игрока'
    case 'filling':
      return 'Комната заполняется'
    case 'countdown':
      return 'Идёт обратный отсчёт'
    case 'playing':
      return 'Раунд запущен'
    case 'finished':
      return 'Раунд завершён'
    default:
      return 'Статус неизвестен'
  }
}

function recalcChances(participants: InternalParticipant[]): ParticipantOdds[] {
  const totalWeight = participants.reduce((acc, item) => acc + item.weight + item.boostPoints, 0)
  return participants
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .map((item) => {
      const fullWeight = item.weight + item.boostPoints
      const chance = totalWeight > 0 ? (fullWeight / totalWeight) * 100 : 0
      return {
        id: item.id,
        name: item.name,
        isBot: item.isBot,
        seat: item.seat,
        boostPoints: item.boostPoints,
        finalChance: Number(chance.toFixed(1)),
        isCurrentUser: item.isCurrentUser,
      }
    })
}

function pickWinner(participants: InternalParticipant[]): string | null {
  const weighted = participants.map((item) => ({ id: item.id, weight: item.weight + item.boostPoints }))
  const total = weighted.reduce((acc, item) => acc + item.weight, 0)
  if (total <= 0) {
    return weighted[0]?.id ?? null
  }

  const random = Math.random() * total
  let cursor = 0
  for (const item of weighted) {
    cursor += item.weight
    if (random <= cursor) {
      return item.id
    }
  }

  return weighted[weighted.length - 1]?.id ?? null
}

function toRoundHistoryItem(
  room: RoomState,
  participants: InternalParticipant[],
  winnerName: string,
  config: RoomConfig,
): RoundHistoryItem {
  const botsTotal = participants.filter((participant) => participant.isBot).length
  const usedBoost = participants.some((participant) => participant.isCurrentUser && participant.boostPoints > 0)
  const prize = Math.round(room.jackpot * (config.prizeFundPercent / 100))
  return {
    id: `RH-${Date.now()}`,
    roomId: room.id,
    participantsTotal: participants.length,
    botsTotal,
    jackpot: room.jackpot,
    winnerName,
    prize,
    usedBoost,
    startedAt: nowLabel(),
    finishedAt: nowLabel(),
    winnerReason: `Победитель выбран взвешенным RNG на основе шанса и буста. Буст учитывался: ${usedBoost ? 'да' : 'нет'}.`,
    balanceDelta: winnerName.includes('(вы)') ? prize - room.entryCost : -room.entryCost,
  }
}

export function useRoomMockStore({ user, onLeaveRoom }: UseRoomMockStoreParams): UseRoomMockStoreResult {
  const [roomConfig] = useState<RoomConfig>(DEFAULT_CONFIG)
  const [room, setRoom] = useState<RoomState>({
    id: 'RM-901',
    title: 'VIP room: Турбо-дуэль',
    entryCost: roomConfig.entryCost,
    seatsTotal: roomConfig.seatsTotal,
    seatsTaken: 1,
    jackpot: roomConfig.entryCost,
    phase: 'waiting',
    countdownSeconds: COUNTDOWN_SECONDS,
    playingSeconds: PLAYING_SECONDS,
    winnerId: null,
  })

  const [participants, setParticipants] = useState<InternalParticipant[]>([
    {
      id: user.id,
      name: user.name,
      isBot: false,
      seat: 1,
      weight: 100,
      boostPoints: 0,
      isCurrentUser: true,
    },
  ])
  const [currentBalance, setCurrentBalance] = useState(user.balance - roomConfig.entryCost)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(user.id)
  const [timeline, setTimeline] = useState<RoundTimelineEvent[]>([
    {
      id: 'event-start',
      text: 'Вы вошли в комнату. Баллы зарезервированы.',
      at: nowLabel(),
    },
  ])
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [boostPurchased, setBoostPurchased] = useState(false)
  const botIndexRef = useRef(0)

  const botPool = useMemo(
    () => [
      { id: 'bot-1', name: 'Бот Спринт', weight: 82 },
      { id: 'bot-2', name: 'Бот Радар', weight: 95 },
      { id: 'bot-3', name: 'Бот Финиш', weight: 87 },
      { id: 'bot-4', name: 'Бот Стрим', weight: 92 },
    ],
    [],
  )

  const addTimeline = (text: string): void => {
    setTimeline((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        at: nowLabel(),
      },
      ...prev,
    ].slice(0, 14))
  }

  const syncRoomByParticipants = (nextParticipants: InternalParticipant[]): void => {
    setRoom((prev) => ({
      ...prev,
      seatsTaken: nextParticipants.length,
      jackpot: nextParticipants.length * prev.entryCost,
    }))
  }

  const addBotIfNeeded = useCallback((): void => {
    setParticipants((prev) => {
      if (prev.length >= room.seatsTotal || room.phase !== 'filling') {
        return prev
      }

      const botTemplate = botPool[botIndexRef.current % botPool.length]
      botIndexRef.current += 1

      const nextParticipant: InternalParticipant = {
        id: `${botTemplate.id}-${botIndexRef.current}`,
        name: botTemplate.name,
        isBot: true,
        seat: prev.length + 1,
        weight: botTemplate.weight,
        boostPoints: 0,
        isCurrentUser: false,
      }
      const nextParticipants = [...prev, nextParticipant]
      syncRoomByParticipants(nextParticipants)

      if (nextParticipants.length >= room.seatsTotal) {
        setRoom((roomPrev) => {
          if (roomPrev.phase !== 'filling') {
            return roomPrev
          }
          return { ...roomPrev, phase: 'countdown', countdownSeconds: COUNTDOWN_SECONDS }
        })
        addTimeline(`Статус комнаты: ${toPhaseText('countdown')}.`)
        addTimeline('Комната заполнена. Запуск обратного отсчёта.')
      }

      return nextParticipants
    })
  }, [botPool, room.phase, room.seatsTotal])

  useEffect(() => {
    if (room.phase !== 'filling') {
      return
    }

    const id = window.setInterval(() => {
      addBotIfNeeded()
    }, 1800)

    return () => window.clearInterval(id)
  }, [addBotIfNeeded, room.phase])

  useEffect(() => {
    if (room.phase !== 'countdown') {
      return
    }

    const id = window.setInterval(() => {
      setRoom((prev) => {
        if (prev.phase !== 'countdown') {
          return prev
        }

        if (prev.countdownSeconds <= 1) {
          addTimeline(`Статус комнаты: ${toPhaseText('playing')}.`)
          addTimeline('Раунд стартовал.')
          return { ...prev, phase: 'playing', countdownSeconds: 0, playingSeconds: PLAYING_SECONDS }
        }

        return { ...prev, countdownSeconds: prev.countdownSeconds - 1 }
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [room.phase])

  useEffect(() => {
    if (room.phase !== 'playing') {
      return
    }

    const id = window.setInterval(() => {
      setRoom((prev) => {
        if (prev.phase !== 'playing') {
          return prev
        }

        if (prev.playingSeconds <= 1) {
          const winnerId = pickWinner(participants)
          if (winnerId) {
            const winner = participants.find((item) => item.id === winnerId)
            const winnerName = winner ? `${winner.name}${winner.isCurrentUser ? ' (вы)' : ''}` : 'Неизвестный игрок'
            addTimeline(`Статус комнаты: ${toPhaseText('finished')}.`)
            addTimeline(`Победитель раунда: ${winnerName}.`)
            setRoundHistory((history) => [
              toRoundHistoryItem(prev, participants, winnerName, roomConfig),
              ...history,
            ].slice(0, 20))
          }
          return { ...prev, phase: 'finished', playingSeconds: 0, winnerId }
        }

        return { ...prev, playingSeconds: prev.playingSeconds - 1 }
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [participants, room.phase, roomConfig])

  const roomActions: RoomActions = {
    joinRoom: () => {
      setErrorMessage('')
      setRoom((prev) => ({
        ...prev,
        phase: 'filling',
        winnerId: null,
        countdownSeconds: COUNTDOWN_SECONDS,
        playingSeconds: PLAYING_SECONDS,
      }))
      addTimeline(`Статус комнаты: ${toPhaseText('filling')}.`)
      addTimeline('Запущено заполнение комнаты. Ожидаем участников и ботов.')
    },
    buyBoost: () => {
      setErrorMessage('')

      if (room.phase === 'finished') {
        setErrorMessage('Раунд завершён. Для покупки буста начните новый раунд.')
        return
      }

      if (boostPurchased) {
        setErrorMessage('Буст уже куплен в текущем раунде.')
        return
      }

      if (currentBalance < roomConfig.boostPrice) {
        setErrorMessage('Недостаточно баллов для буста. Подберите комнату дешевле и попробуйте снова.')
        return
      }

      setBoostPurchased(true)
      setCurrentBalance((prev) => prev - roomConfig.boostPrice)
      setParticipants((prev) =>
        prev.map((item) =>
          item.isCurrentUser
            ? {
                ...item,
                boostPoints: item.boostPoints + BOOST_WEIGHT,
              }
            : item,
        ),
      )
      addTimeline('Вы купили буст. Шанс победы обновлён.')
    },
    repeatRound: () => {
      setErrorMessage('')
      setBoostPurchased(false)
      setParticipants((prev) => {
        const nextParticipants = prev.map((item, index) => ({
          ...item,
          boostPoints: 0,
          seat: index + 1,
        }))
        syncRoomByParticipants(nextParticipants)
        return nextParticipants
      })
      setRoom((prev) => ({
        ...prev,
        phase: 'filling',
        winnerId: null,
        countdownSeconds: COUNTDOWN_SECONDS,
        playingSeconds: PLAYING_SECONDS,
      }))
      addTimeline(`Статус комнаты: ${toPhaseText('filling')}.`)
      addTimeline('Запущен новый раунд в этой же комнате.')
    },
    refreshRoom: () => {
      botIndexRef.current = 0
      const resetParticipants: InternalParticipant[] = [
        {
          id: user.id,
          name: user.name,
          isBot: false,
          seat: 1,
          weight: 100,
          boostPoints: 0,
          isCurrentUser: true,
        },
      ]
      setRoom({
        id: 'RM-901',
        title: 'VIP room: Турбо-дуэль',
        entryCost: roomConfig.entryCost,
        seatsTotal: roomConfig.seatsTotal,
        seatsTaken: 1,
        jackpot: roomConfig.entryCost,
        phase: 'waiting',
        countdownSeconds: COUNTDOWN_SECONDS,
        playingSeconds: PLAYING_SECONDS,
        winnerId: null,
      })
      setParticipants(resetParticipants)
      setCurrentBalance(user.balance - roomConfig.entryCost)
      setSelectedParticipantId(user.id)
      setErrorMessage('')
      setBoostPurchased(false)
      setTimeline([
        {
          id: 'event-refresh',
          text: 'Комната обновлена. Данные сброшены в стартовое состояние.',
          at: nowLabel(),
        },
      ])
      addTimeline(`Статус комнаты: ${toPhaseText('waiting')}.`)
    },
    leaveRoom: () => {
      onLeaveRoom()
    },
    selectParticipant: (participantId: string) => {
      setSelectedParticipantId(participantId)
    },
  }

  const participantOdds = useMemo(() => recalcChances(participants), [participants])

  const boostDisabledReason = useMemo(() => {
    if (boostPurchased) {
      return 'Буст уже применён'
    }
    if (room.phase === 'finished') {
      return 'Раунд завершён'
    }
    if (currentBalance < roomConfig.boostPrice) {
      return 'Недостаточно бонусных баллов'
    }
    return null
  }, [boostPurchased, currentBalance, room.phase, roomConfig.boostPrice])

  const boost: BoostState = {
    price: roomConfig.boostPrice,
    chanceBonusPercent: BOOST_WEIGHT,
    purchasedByCurrentUser: boostPurchased,
    disabledReason: boostDisabledReason,
  }

  return {
    room,
    roomConfig,
    participants: participantOdds,
    boost,
    timeline,
    roundHistory,
    currentBalance,
    selectedParticipantId,
    errorMessage,
    actions: roomActions,
  }
}
