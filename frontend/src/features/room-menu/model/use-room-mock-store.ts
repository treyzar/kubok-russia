import { useEffect, useMemo, useRef, useState } from 'react'

import type { AuthUser } from '@/features/mock-auth/model/mock-auth'

import type { BoostState, ParticipantOdds, RoomActions, RoomState, RoundPhase, RoundTimelineEvent } from './types'

type UseRoomMockStoreParams = {
  user: AuthUser
  onLeaveRoom: () => void
}

type UseRoomMockStoreResult = {
  room: RoomState
  participants: ParticipantOdds[]
  boost: BoostState
  timeline: RoundTimelineEvent[]
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

const BOOST_PRICE = 300
const BOOST_WEIGHT = 20
const COUNTDOWN_SECONDS = 12
const PLAYING_SECONDS = 10
const DEFAULT_ENTRY_COST = 500

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

export function useRoomMockStore({ user, onLeaveRoom }: UseRoomMockStoreParams): UseRoomMockStoreResult {
  const createInitialRoom = (): RoomState => ({
    id: 'RM-901',
    title: 'VIP room: Турбо-дуэль',
    entryCost: DEFAULT_ENTRY_COST,
    seatsTotal: 4,
    seatsTaken: 1,
    jackpot: DEFAULT_ENTRY_COST,
    phase: 'waiting',
    countdownSeconds: COUNTDOWN_SECONDS,
    playingSeconds: PLAYING_SECONDS,
    winnerId: null,
  })

  const createInitialParticipants = (): InternalParticipant[] => [
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

  const [room, setRoom] = useState<RoomState>({
    ...createInitialRoom(),
  })

  const [participants, setParticipants] = useState<InternalParticipant[]>(createInitialParticipants())

  const [currentBalance, setCurrentBalance] = useState(user.balance - DEFAULT_ENTRY_COST)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(user.id)
  const [timeline, setTimeline] = useState<RoundTimelineEvent[]>([
    {
      id: 'event-start',
      text: 'Вы вошли в комнату. Баллы зарезервированы.',
      at: nowLabel(),
    },
  ])
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
    ].slice(0, 10))
  }

  const addBotIfNeeded = (): void => {
    setParticipants((prev) => {
      if (prev.length >= room.seatsTotal) {
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

      return [...prev, nextParticipant]
    })
  }

  useEffect(() => {
    if (room.phase !== 'filling') {
      return
    }

    if (participants.length >= room.seatsTotal) {
      setRoom((prev) => ({ ...prev, phase: 'countdown', countdownSeconds: COUNTDOWN_SECONDS }))
      addTimeline('Комната заполнена. Запуск обратного отсчёта.')
      return
    }

    const id = window.setInterval(() => {
      addBotIfNeeded()
    }, 2200)

    return () => window.clearInterval(id)
  }, [participants.length, room.phase, room.seatsTotal])

  useEffect(() => {
    setRoom((prev) => ({
      ...prev,
      seatsTaken: participants.length,
      jackpot: participants.length * prev.entryCost,
    }))
  }, [participants.length])

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
            addTimeline(`Победитель раунда: ${winner?.name ?? 'Неизвестный игрок'}.`)
          }
          return { ...prev, phase: 'finished', playingSeconds: 0, winnerId }
        }

        return { ...prev, playingSeconds: prev.playingSeconds - 1 }
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [participants, room.phase])

  const roomActions: RoomActions = {
    joinRoom: () => {
      setErrorMessage('')
      setRoom((prev) => ({ ...prev, phase: 'filling', winnerId: null, countdownSeconds: COUNTDOWN_SECONDS, playingSeconds: PLAYING_SECONDS }))
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

      if (currentBalance < BOOST_PRICE) {
        setErrorMessage('Недостаточно баллов для покупки буста. Выберите комнату дешевле или пополните баланс.')
        return
      }

      setBoostPurchased(true)
      setCurrentBalance((prev) => prev - BOOST_PRICE)
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
      setParticipants((prev) =>
        prev.map((item, index) => ({
          ...item,
          boostPoints: 0,
          seat: index + 1,
        })),
      )
      setRoom((prev) => ({
        ...prev,
        phase: 'filling',
        winnerId: null,
        countdownSeconds: COUNTDOWN_SECONDS,
        playingSeconds: PLAYING_SECONDS,
      }))
      addTimeline('Запущен новый раунд в этой же комнате.')
    },
    refreshRoom: () => {
      botIndexRef.current = 0
      setRoom(createInitialRoom())
      setParticipants(createInitialParticipants())
      setCurrentBalance(user.balance - DEFAULT_ENTRY_COST)
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
    },
    leaveRoom: () => {
      onLeaveRoom()
    },
    selectParticipant: (participantId: string) => {
      setSelectedParticipantId(participantId)
    },
  }

  const participantOdds = useMemo(() => recalcChances(participants), [participants])

  const boost: BoostState = {
    price: BOOST_PRICE,
    chanceBonusPercent: BOOST_WEIGHT,
    purchasedByCurrentUser: boostPurchased,
    disabledReason: boostPurchased ? 'Буст уже применён' : null,
  }

  useEffect(() => {
    addTimeline(`Статус комнаты: ${toPhaseText(room.phase)}.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.phase])

  return {
    room,
    participants: participantOdds,
    boost,
    timeline,
    currentBalance,
    selectedParticipantId,
    errorMessage,
    actions: roomActions,
  }
}
