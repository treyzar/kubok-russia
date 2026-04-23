import { ChevronDown, LogOut, Search } from 'lucide-react'

import { useBodyScrollLock } from '@shared/lib'
import { Button, Card, Input } from '@shared/ui'
import { AppHeader } from '@widgets/header'

import { useCreateGame } from '../lib'
import { type CreateGamePageProps } from '../model'
import { BackgroundPicker } from './background-picker'
import { ConfiguratorModal } from './configurator-modal'

export function CreateGamePage({ onBackToGames, onJoinGame, onOpenLobby, onLogout, user }: CreateGamePageProps) {
  useBodyScrollLock()

  const {
    playersCount,
    handlePlayersCountChange,
    startPrice,
    handleStartPriceChange,
    background,
    setBackground,
    showTutorial,
    setShowTutorial,
    isConfiguratorOpen,
    setIsConfiguratorOpen,
    configDraft,
    updateConfigField,
    configAnalysis,
    configSaved,
    saveConfig,
    templatesInfo,
    templates,
    isCreatingRoom,
    actionError,
    handleCreateRoom,
    templateName,
    setTemplateName,
    saveTemplateMutation,
    applyTemplate,
    templateSaveSuccess,
  } = useCreateGame()

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#FF1493] text-[#F2F3F5]">
      <section className="flex h-full w-full flex-col overflow-hidden">
        <AppHeader onBrandClick={onBackToGames} onLogout={onLogout} user={user} />

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
                    onChange={(e) => handlePlayersCountChange(e.target.value)}
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
                    onChange={(e) => handleStartPriceChange(e.target.value)}
                    value={startPrice}
                  />
                </div>

                <div className="grid items-center gap-2 md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
                  <p className="text-[15px] font-medium text-[#ECEEF4] md:text-[18px]">Фон игры</p>
                  <BackgroundPicker onChange={setBackground} value={background} />
                </div>
              </div>

              <label className="mt-4 inline-flex items-center gap-2.5 text-[14px] font-medium text-[#A8AFBC] md:text-[16px]">
                <input
                  checked={showTutorial}
                  className="size-5 appearance-none rounded-[4px] border border-[#ABE362] bg-transparent checked:bg-[#ABE362]"
                  onChange={(e) => setShowTutorial(e.target.checked)}
                  type="checkbox"
                />
                Показывать обучение в начале игры
              </label>

              <p className="mt-3 text-[13px] text-[#A1A7B5]">{templatesInfo}</p>
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
                  disabled={isCreatingRoom}
                  onClick={() => {
                    void handleCreateRoom((roomId) => onOpenLobby(roomId))
                  }}
                  type="button"
                >
                  {isCreatingRoom ? '...' : 'Начать'}
                </Button>
              </div>
            </div>

            {configSaved ? (
              <p className="mt-3 rounded-[10px] border border-[#78B84A] bg-[#203121] px-3 py-2 text-[14px] text-[#CFF3B8]">
                Конфигурация сохранена. Оценка обновлена: привлекательность {configAnalysis.attractivenessScore}%, выгода организатора {configAnalysis.organizerScore}%.
              </p>
            ) : null}

            {actionError ? (
              <p className="mt-3 rounded-[10px] border border-[#AA4242] bg-[#3A2020] px-3 py-2 text-[14px] text-[#FFD3D3]">{actionError}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {isConfiguratorOpen ? (
        <ConfiguratorModal
          analysis={configAnalysis}
          applyTemplate={applyTemplate}
          draft={configDraft}
          onClose={() => setIsConfiguratorOpen(false)}
          onFieldChange={updateConfigField}
          onSave={saveConfig}
          saveTemplateMutation={saveTemplateMutation}
          setTemplateName={setTemplateName}
          templateName={templateName}
          templateSaveSuccess={templateSaveSuccess}
          templates={templates}
        />
      ) : null}

      <Button className="sr-only" onClick={onLogout} type="button" variant="ghost">
        <LogOut className="size-4" />
        Выйти
      </Button>
    </main>
  )
}
