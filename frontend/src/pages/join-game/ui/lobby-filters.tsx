import { ChevronDown, Search } from 'lucide-react'
import { Button, Card, Input } from '@shared/ui'
import type { Lobby } from '../model/types'

type LobbyFiltersProps = {
  searchTerm: string
  onSearchChange: (value: string) => void
  priceFilterLabel: string
  onCyclePrice: () => void
  seatsFilterLabel: string
  onCycleSeats: () => void
  sortByLabel: string
  onCycleSort: () => void
  onlyAffordable: boolean
  onToggleAffordable: () => void
  bestMatch: Lobby | null
}

export function LobbyFilters({
  searchTerm,
  onSearchChange,
  priceFilterLabel,
  onCyclePrice,
  seatsFilterLabel,
  onCycleSeats,
  sortByLabel,
  onCycleSort,
  onlyAffordable,
  onToggleAffordable,
  bestMatch,
}: LobbyFiltersProps) {
  return (
    <Card className="rounded-[20px] border border-[#2F352F] bg-[#2A3325] p-3 shadow-[0_12px_24px_rgba(0,0,0,0.30)] sm:p-3.5">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_132px_132px] sm:gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-[#83889A]" />
          <Input
            className="h-[56px] rounded-[12px] border-[#333A45] bg-[#12141A] pl-11 text-[16px] text-[#F3F5F8] placeholder:text-[#949BB0] sm:h-[58px]"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск по ID/создателю..."
            value={searchTerm}
          />
        </div>
        <Button
          className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] hover:bg-[#181B22] sm:h-[58px]"
          onClick={onCyclePrice}
          type="button"
          variant="outline"
        >
          <span>
            {priceFilterLabel}
            <br />
            начальная
            <br />
            стоимость
          </span>
          <ChevronDown className="size-4 shrink-0" />
        </Button>
        <Button
          className="h-[56px] justify-between rounded-[12px] border border-[#333A45] bg-[#12141A] px-3 text-left text-[14px] leading-[1.03] text-[#EEF1F7] hover:bg-[#181B22] sm:h-[58px]"
          onClick={onCycleSeats}
          type="button"
          variant="outline"
        >
          <span>
            {seatsFilterLabel}
            <br />
            игроков
          </span>
          <ChevronDown className="size-4 shrink-0" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          className="h-9 rounded-[10px] border border-[#333A45] bg-[#12141A] px-3 text-[13px] text-[#EEF1F7] hover:bg-[#181B22]"
          onClick={onCycleSort}
          type="button"
          variant="outline"
        >
          Сортировка: {sortByLabel}
        </Button>
        <Button
          className="h-9 rounded-[10px] border border-[#333A45] bg-[#12141A] px-3 text-[13px] text-[#EEF1F7] hover:bg-[#181B22]"
          onClick={onToggleAffordable}
          type="button"
          variant="outline"
        >
          {onlyAffordable ? 'Только доступные: да' : 'Только доступные: нет'}
        </Button>
      </div>

      {bestMatch ? (
        <p className="mt-2 rounded-lg border border-[#3A4550] bg-[#18202B] px-3 py-2 text-[13px] text-[#D2DCE8]">
          Подходящая комната: №{bestMatch.id} • вход {bestMatch.cost} • {bestMatch.players}
        </p>
      ) : (
        <p className="mt-2 rounded-lg border border-[#4E2D2D] bg-[#2C1B1B] px-3 py-2 text-[13px] text-[#FFD0D0]">
          По вашим параметрам нет комнат. Измените фильтры.
        </p>
      )}
    </Card>
  )
}
