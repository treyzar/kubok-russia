import { ChevronDown, LogOut, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useBodyScrollLock } from '@shared/lib'
import { Button, Card, Input } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import {
  analyzeRoomConfigurator,
  initialRoomConfiguratorState,
  type CreateGamePageProps,
  type GameBackground,
  type RoomConfiguratorState,
} from '../model'

export function CreateGamePage({ onBackToGames, onJoinGame, onOpenLobby, onLogout, user }: CreateGamePageProps) {
  const [playersCount, setPlayersCount] = useState('10')
  const [startPrice, setStartPrice] = useState('3000')
  const [background, setBackground] = useState<GameBackground>('altai')
  const [showTutorial, setShowTutorial] = useState(false)
  const [isConfiguratorOpen, setIsConfiguratorOpen] = useState(false)
  const [configDraft, setConfigDraft] = useState<RoomConfiguratorState>(initialRoomConfiguratorState)
  const [configSaved, setConfigSaved] = useState(false)

  useBodyScrollLock()
  const configAnalysis = useMemo(() => analyzeRoomConfigurator(configDraft), [configDraft])

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#FF1493] text-[#F2F3F5]">
      <section className="flex h-full w-full flex-col overflow-hidden">
        <AppHeader onBrandClick={onBackToGames} user={user} />

        <section className="mx-auto grid w-full max-w-[1248px] flex-1 grid-cols-1 gap-4 overflow-y-auto px-3 pb-5 pt-4 sm:px-4 lg:grid-cols-[minmax(260px,418px)_1fr] lg:gap-6 lg:px-5 xl:px-0">
          <aside className="relative min-h-[340px] overflow-hidden rounded-[12px] border border-[#2D2E33] bg-[#1A1B21] sm:min-h-[420px] lg:min-h-0">
            <img alt="Игровой холодильник" className="h-full w-full object-cover" src="/dev-assets/images/logo-fridge.png" />
            <div className="absolute inset-x-[14px] top-[47%] flex -translate-y-1/2 flex-col gap-2.5">
              <Button
                className="h-[56px] rounded-[9px] border-0 bg-[#6B22F5] text-[16px] font-bold text-white transition-[transform,box-shadow,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#7A36F7] hover:shadow-[0_14px_28px_rgba(86,35,210,0.50)] active:translate-y-0 active:scale-[0.98] sm:h-[64px] sm:text-[18px]"
                onClick={onBackToGames}
                type="button"
              >
                БЫСТРАЯ ИГРА
              </Button>
              <Button
                className="h-[56px] rounded-[9px] border-0 bg-[#A8E45E] text-[16px] font-bold text-[#101114] transition-[transform,box-shadow,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#B9ED76] hover:text-[#101114] hover:shadow-[0_14px_28px_rgba(113,155,62,0.45)] active:translate-y-0 active:scale-[0.98] sm:h-[64px] sm:text-[18px]"
                onClick={onJoinGame}
                type="button"
              >
                ПРИСОЕДИНИТЬСЯ К ИГРЕ
              </Button>
            </div>
          </aside>

          <div className="min-w-0">
            <Card className="rounded-[20px] border border-[#432644] bg-[#3A2140] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.30)] sm:p-3.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_132px_132px] sm:gap-3">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#83889A]" />
                  <Input
                    className="h-[56px] rounded-[12px] border-[#333A45] bg-[#12141A] pl-11 text-[16px] text-[#F3F5F8] placeholder:text-[#949BB0] sm:h-[58px]"
                    placeholder="Поиск..."
                  />
                </div>
                <Button
                  className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#181B22] hover:text-[#EEF1F7] hover:shadow-[0_10px_22px_rgba(7,9,14,0.45)] active:translate-y-0 active:scale-[0.98] sm:h-[58px]"
                  type="button"
                  variant="outline"
                >
                  <span>
                    Любая
                    <br />
                    начальная
                    <br />
                    стоимость
                  </span>
                  <ChevronDown className="size-4 shrink-0" />
                </Button>
                <Button
                  className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#181B22] hover:text-[#EEF1F7] hover:shadow-[0_10px_22px_rgba(7,9,14,0.45)] active:translate-y-0 active:scale-[0.98] sm:h-[58px]"
                  type="button"
                  variant="outline"
                >
                  <span>
                    Любое число
                    <br />
                    игроков
                  </span>
                  <ChevronDown className="size-4 shrink-0" />
                </Button>
              </div>
            </Card>

            <Card className="mt-4 rounded-[20px] border border-[#2B2F3A] bg-[#191B22] p-3.5 shadow-[0_16px_30px_rgba(10,10,12,0.38)] sm:p-5 lg:p-6">
              <h1 className="m-0 text-[42px] leading-[0.92] font-bold text-[#ADE562] sm:text-[50px] lg:text-[56px]">Создать игру</h1>
              <p className="mt-1.5 text-[14px] leading-tight font-medium text-[#A1A7B5] sm:text-[15px] md:text-[16px]">Настройки игры</p>

              <div className="mt-4 h-px w-full bg-[#2F3442]" />

              <div className="mt-4 space-y-3.5">
                <div className="grid items-center gap-2 md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
                  <label className="text-[15px] font-medium text-[#ECEEF4] md:text-[18px]" htmlFor="players-count">
                    Число игроков
                  </label>
                  <Input
                    className="h-[46px] rounded-[12px] border-[#363B4A] bg-[#17181D] text-[16px] text-[#ECEEF4] focus-visible:border-[#555C6D]"
                    id="players-count"
                    onChange={(event) => setPlayersCount(event.target.value)}
                    value={playersCount}
                  />
                </div>

                <div className="grid items-center gap-2 md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
                  <label className="text-[15px] font-medium text-[#ECEEF4] md:text-[18px]" htmlFor="start-price">
                    Начальная стоимость
                  </label>
                  <Input
                    className="h-[46px] rounded-[12px] border-[#363B4A] bg-[#17181D] text-[16px] text-[#ECEEF4] focus-visible:border-[#555C6D]"
                    id="start-price"
                    onChange={(event) => setStartPrice(event.target.value)}
                    value={startPrice}
                  />
                </div>

                <div className="grid items-center gap-2 md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
                  <p className="text-[15px] font-medium text-[#ECEEF4] md:text-[18px]">Фон игры</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Button
                      className={`h-[46px] rounded-[12px] text-[16px] font-medium ${
                        background === 'altai'
                          ? 'bg-[#FF1493] text-white hover:bg-[#FF2BA1] hover:text-white hover:shadow-[0_12px_24px_rgba(255,20,147,0.45)]'
                          : 'border border-[#363B4A] bg-[#17181D] text-[#ECEEF4] hover:bg-[#1E2027] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.44)]'
                      }`}
                      onClick={() => setBackground('altai')}
                      type="button"
                    >
                      Алтай
                    </Button>
                    <Button
                      className={`h-[46px] rounded-[12px] text-[16px] font-medium ${
                        background === 'space'
                          ? 'bg-[#FF1493] text-white hover:bg-[#FF2BA1] hover:text-white hover:shadow-[0_12px_24px_rgba(255,20,147,0.45)]'
                          : 'border border-[#363B4A] bg-[#17181D] text-[#ECEEF4] hover:bg-[#1E2027] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.44)]'
                      }`}
                      onClick={() => setBackground('space')}
                      type="button"
                    >
                      Космос
                    </Button>
                    <Button
                      className={`h-[46px] rounded-[12px] text-[16px] font-medium ${
                        background === 'japan'
                          ? 'bg-[#FF1493] text-white hover:bg-[#FF2BA1] hover:text-white hover:shadow-[0_12px_24px_rgba(255,20,147,0.45)]'
                          : 'border border-[#363B4A] bg-[#17181D] text-[#ECEEF4] hover:bg-[#1E2027] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.44)]'
                      }`}
                      onClick={() => setBackground('japan')}
                      type="button"
                    >
                      Япония
                    </Button>
                  </div>
                </div>
              </div>

              <label className="mt-4 inline-flex items-center gap-2.5 text-[14px] font-medium text-[#A8AFBC] md:text-[16px]">
                <input
                  checked={showTutorial}
                  className="size-5 appearance-none rounded-[4px] border border-[#ABE362] bg-transparent checked:bg-[#ABE362]"
                  onChange={(event) => setShowTutorial(event.target.checked)}
                  type="checkbox"
                />
                Показывать обучение в начале игры
              </label>
            </Card>

            <div className="mt-4 flex justify-end">
              <div className="flex items-center gap-2">
                <Button
                  className="h-[54px] rounded-[10px] border border-[#8A62FF] bg-[#3E2A6B] px-5 text-[17px] font-semibold text-white hover:bg-[#4B3380]"
                  onClick={() => setIsConfiguratorOpen(true)}
                  type="button"
                  variant="outline"
                >
                  Конфигуратор
                </Button>
                <Button
                  className="h-[54px] min-w-[138px] rounded-[10px] bg-[#6B22F5] px-8 text-[38px] font-semibold text-white shadow-[0_10px_20px_rgba(68,44,229,0.38)] transition-[transform,box-shadow,background-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#7D38FF] hover:text-white hover:shadow-[0_16px_30px_rgba(86,58,240,0.50)] active:translate-y-0 active:scale-[0.98]"
                  onClick={onOpenLobby}
                  type="button"
                >
                  Начать
                </Button>
              </div>
            </div>
            {configSaved ? (
              <p className="mt-3 rounded-[10px] border border-[#78B84A] bg-[#203121] px-3 py-2 text-[14px] text-[#CFF3B8]">
                Конфигурация сохранена. Оценка обновлена: привлекательность {configAnalysis.attractivenessScore}%, выгода организатора {configAnalysis.organizerScore}%.
              </p>
            ) : null}
          </div>
        </section>
      </section>

      {isConfiguratorOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm">
          <div className="mx-auto max-h-full w-full max-w-[880px] overflow-y-auto rounded-[20px] border border-[#4B2F67] bg-[#1A1C25] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[28px] font-bold text-[#ADE562]">Конфигуратор комнаты</h2>
              <Button className="rounded-[9px] border border-[#50576A] bg-[#202532] px-3 hover:bg-[#252B3B]" onClick={() => setIsConfiguratorOpen(false)} type="button" variant="outline">
                Закрыть
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm text-[#A5ADC1]">Количество мест</span>
                <Input
                  className="h-[44px] rounded-[10px] border-[#364050] bg-[#141821]"
                  onChange={(event) => setConfigDraft((prev) => ({ ...prev, seatsTotal: Number(event.target.value || 0) }))}
                  type="number"
                  value={String(configDraft.seatsTotal)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[#A5ADC1]">Цена входа</span>
                <Input
                  className="h-[44px] rounded-[10px] border-[#364050] bg-[#141821]"
                  onChange={(event) => setConfigDraft((prev) => ({ ...prev, entryCost: Number(event.target.value || 0) }))}
                  type="number"
                  value={String(configDraft.entryCost)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[#A5ADC1]">Фонд победителю (%)</span>
                <Input
                  className="h-[44px] rounded-[10px] border-[#364050] bg-[#141821]"
                  onChange={(event) => setConfigDraft((prev) => ({ ...prev, prizeFundPercent: Number(event.target.value || 0) }))}
                  type="number"
                  value={String(configDraft.prizeFundPercent)}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[#A5ADC1]">Стоимость буста</span>
                <Input
                  className="h-[44px] rounded-[10px] border-[#364050] bg-[#141821]"
                  onChange={(event) => setConfigDraft((prev) => ({ ...prev, boostPrice: Number(event.target.value || 0) }))}
                  type="number"
                  value={String(configDraft.boostPrice)}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-[12px] border border-[#325744] bg-[#1C2B23] px-3 py-2">
                <p className="text-sm text-[#9DD9B5]">Привлекательность для игрока</p>
                <p className="text-2xl font-bold text-[#CCF6DE]">{configAnalysis.attractivenessScore}%</p>
              </div>
              <div className="rounded-[12px] border border-[#4D4A2A] bg-[#2B2919] px-3 py-2">
                <p className="text-sm text-[#D9D296]">Выгода для организатора</p>
                <p className="text-2xl font-bold text-[#F7EEB3]">{configAnalysis.organizerScore}%</p>
              </div>
            </div>

            {configAnalysis.warnings.length > 0 ? (
              <div className="mt-4 rounded-[12px] border border-[#786C34] bg-[#332D18] px-3 py-3">
                <p className="text-sm font-semibold text-[#F1E3A3]">Предупреждения</p>
                <ul className="mt-2 space-y-1 text-sm text-[#F5EEC8]">
                  {configAnalysis.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {configAnalysis.errors.length > 0 ? (
              <div className="mt-4 rounded-[12px] border border-[#8A3C3C] bg-[#3A1E1E] px-3 py-3">
                <p className="text-sm font-semibold text-[#FFB8B8]">Невалидная конфигурация</p>
                <ul className="mt-2 space-y-1 text-sm text-[#FFD1D1]">
                  {configAnalysis.errors.map((error) => (
                    <li key={error}>• {error}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                className="rounded-[10px] bg-[#6B22F5] px-5 text-white hover:bg-[#7D38FF]"
                disabled={!configAnalysis.canSave}
                onClick={() => {
                  setPlayersCount(String(configDraft.seatsTotal))
                  setStartPrice(String(configDraft.entryCost))
                  setConfigSaved(true)
                  setIsConfiguratorOpen(false)
                }}
                type="button"
              >
                Сохранить конфигурацию
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Button className="sr-only" onClick={onLogout} type="button" variant="ghost">
        <LogOut className="size-4" />
        Выйти
      </Button>
    </main>
  )
}
