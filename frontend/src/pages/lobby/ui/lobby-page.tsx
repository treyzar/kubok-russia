import { Bell, ChevronDown, Plus, Send, Settings } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type LobbyPageProps = {
  onBackToGames: () => void
  onCreateGame: () => void
  onStartGame: () => void
}

type PlayerFace = 'smile' | 'beard'

type SidePlayer = {
  id: string
  top: string
  right: string
  ringColor: string
  face: PlayerFace
}

const FACE_POSITION: Record<PlayerFace, string> = {
  smile: '90% 31%',
  beard: '54% 29%',
}

const SIDE_PLAYERS: SidePlayer[] = [
  { id: '1', top: '12.4%', right: '14.5%', ringColor: '#6E2BFF', face: 'smile' },
  { id: '2', top: '12.4%', right: '3.3%', ringColor: '#FF2A1F', face: 'smile' },
  { id: '3', top: '24.1%', right: '14.5%', ringColor: '#FF1595', face: 'beard' },
  { id: '4', top: '24.1%', right: '3.3%', ringColor: '#AEE85F', face: 'smile' },
  { id: '5', top: '35.8%', right: '14.5%', ringColor: '#6E2BFF', face: 'smile' },
  { id: '6', top: '35.8%', right: '3.3%', ringColor: '#FF2A1F', face: 'smile' },
  { id: '7', top: '47.5%', right: '14.5%', ringColor: '#FF1595', face: 'beard' },
  { id: '8', top: '47.5%', right: '3.3%', ringColor: '#6E2BFF', face: 'smile' },
  { id: '9', top: '59.2%', right: '3.3%', ringColor: '#6E2BFF', face: 'smile' },
  { id: '10', top: '70.9%', right: '14.5%', ringColor: '#FF1595', face: 'beard' },
]

type PlayerAvatarProps = {
  face: PlayerFace
  ringColor: string
  size: string
}

function PlayerAvatar({ face, ringColor, size }: PlayerAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-full p-[4px] shadow-[0_5px_14px_rgba(0,0,0,0.40)]"
      style={{ backgroundColor: ringColor, height: size, width: size }}
    >
      <span className="block h-full w-full overflow-hidden rounded-full border border-black/20 bg-[#121316]">
        <img
          alt=""
          className="h-full w-full object-cover"
          src="/dev-assets/images/card_with_peoples.svg"
          style={{ objectPosition: FACE_POSITION[face] }}
        />
      </span>
    </span>
  )
}

export function LobbyPage({ onBackToGames, onCreateGame, onStartGame }: LobbyPageProps) {
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key.toLowerCase() === 'e') {
        onStartGame()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onStartGame])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  async function handleCopyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText('STNBGH')
      setCopied(true)
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current)
      }
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="fixed inset-0 flex min-h-dvh flex-col overflow-hidden bg-[#15161C] text-[#F2F3F5]">
      <header className="h-[74px] shrink-0 border-b border-[#2D2E34] bg-[#1D1E23]">
        <div className="flex h-full items-center justify-between gap-2 px-4">
          <button
            className="inline-flex cursor-pointer items-center gap-3 rounded-[8px] px-1 py-1 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8E45E]"
            onClick={onBackToGames}
            type="button"
          >
            <img alt="Ночной жор" className="h-[42px] w-[42px] rounded-full object-cover" src="/dev-assets/images/logo.svg" />
            <span className="max-[680px]:hidden text-[39px] leading-none font-bold tracking-[0.015em] uppercase">Ночной жор</span>
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <button
              className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#F21795] bg-[#3B2254] px-3.5 text-[15px] font-semibold text-[#F0EAFB] transition hover:bg-[#4D2C6E]"
              type="button"
            >
              <span className="inline-flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[#7D3EFF] text-[11px] font-bold text-white">₽</span>
              12 000.00
              <ChevronDown className="size-[17px]" />
            </button>
            <button
              className="inline-flex h-[38px] w-[40px] cursor-pointer items-center justify-center rounded-[8px] border border-[#FF1894] bg-[#FF1894] text-white transition hover:bg-[#FF2BA1]"
              onClick={onCreateGame}
              type="button"
            >
              <Plus className="size-[30px]" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[8px] border border-[#7620F5] bg-[#2A1F44] px-2.5 text-[15px] text-[#F0ECFB] transition hover:bg-[#322453]"
              type="button"
            >
              <PlayerAvatar face="smile" ringColor="#6E2BFF" size="26px" />
              <span className="max-w-[150px] truncate font-semibold max-[640px]:max-w-[96px]">Амир Леванов</span>
              <ChevronDown className="size-[17px] shrink-0" />
            </button>
            <button
              aria-label="Сообщения"
              className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[8px] border border-[#3A3B42] bg-[#1C1D24] text-[#ECEEF4] transition hover:bg-[#252731]"
              type="button"
            >
              <Send className="size-[20px]" />
            </button>
            <button
              aria-label="Уведомления"
              className="inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[8px] border border-[#3A3B42] bg-[#1C1D24] text-[#ECEEF4] transition hover:bg-[#252731]"
              type="button"
            >
              <Bell className="size-[20px]" />
            </button>
          </div>
        </div>
      </header>

      <section className="relative flex-1 overflow-hidden bg-[#D5D8DA]">
        <img
          alt="Лобби игры"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
          draggable={false}
          src="/dev-assets/lobby_background.svg"
        />

        <div
          className="absolute z-20 inline-flex items-center gap-2 rounded-[12px] border border-[#41454F] bg-[#2A2D33] px-4 py-2.5 text-[clamp(17px,2vw,30px)] leading-none text-[#EEF1F7] shadow-[0_6px_16px_rgba(0,0,0,0.34)]"
          style={{ left: '50%', top: '2.2%', transform: 'translateX(-50%)' }}
        >
          <span className="font-medium">До начала:</span>
          <span className="font-extrabold">00:30</span>
        </div>

        <div className="absolute inset-0 z-20 max-[900px]:hidden">
          {SIDE_PLAYERS.map((player) => (
            <div className="absolute" key={player.id} style={{ right: player.right, top: player.top }}>
              <PlayerAvatar face={player.face} ringColor={player.ringColor} size="62px" />
            </div>
          ))}

          <div
            className="absolute flex h-[62px] w-[62px] items-center justify-center rounded-full border-[4px] border-dashed border-black bg-white/55 text-[41px] leading-none font-extrabold text-black shadow-[0_5px_14px_rgba(0,0,0,0.3)]"
            style={{ right: '14.2%', top: '59.1%' }}
          >
            +3
          </div>
        </div>

        <button
          aria-label="Открыть настройки"
          className="absolute z-20 inline-flex h-[50px] w-[50px] cursor-pointer items-center justify-center rounded-[9px] border border-white/12 bg-[#1F2025] text-[#F3F4F8] shadow-[0_4px_12px_rgba(0,0,0,0.42)] transition hover:bg-[#282A30]"
          style={{ bottom: '3.8%', left: '2.5%' }}
          type="button"
        >
          <Settings className="size-[25px]" strokeWidth={2.4} />
        </button>

        <button
          aria-label="Скопировать код комнаты"
          className="absolute z-10 cursor-pointer rounded-[12px] bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8E45E]"
          onClick={handleCopyCode}
          style={{ height: '12.6%', left: '34.3%', top: '47.8%', width: '28.5%' }}
          type="button"
        />

        <button
          aria-label="Начать игру"
          className="absolute z-20 inline-flex h-[80px] cursor-pointer items-center gap-3 rounded-[10px] border border-[#8FCA4B] bg-[#ACE45D] px-3.5 text-[32px] leading-none font-extrabold tracking-[0.01em] text-[#111212] shadow-[0_8px_14px_rgba(0,0,0,0.28)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4FFD8]"
          onClick={onStartGame}
          style={{ bottom: '3.8%', right: '2.5%' }}
          type="button"
        >
          <span className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-[7px] border border-white/20 bg-[#15171B] text-[30px] font-black text-[#F5F6F8]">
            E
          </span>
          <span className="whitespace-nowrap uppercase">Начать игру</span>
        </button>

        {copied ? (
          <div className="pointer-events-none absolute bottom-[14%] left-1/2 z-30 -translate-x-1/2 rounded-[10px] bg-black/82 px-4 py-2 text-[14px] font-semibold text-white">
            Код комнаты скопирован
          </div>
        ) : null}
      </section>
    </main>
  )
}
