import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@shared/ui'

type ChampionNavButtonsProps = {
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  disabled?: boolean
}

export function ChampionNavButtons({ prevLabel, nextLabel, onPrev, onNext, disabled }: ChampionNavButtonsProps) {
  return (
    <div className="absolute bottom-6 left-6 flex items-center gap-3">
      <Button
        aria-label={prevLabel}
        className="h-11 w-11 rounded-full bg-[var(--landing-champ-ctrl)] p-0 text-[#151A20] hover:bg-[var(--landing-champ-ctrl)]/90"
        disabled={disabled}
        onClick={onPrev}
        type="button"
        variant="ghost"
      >
        <ArrowLeft className="size-6" />
      </Button>
      <Button
        aria-label={nextLabel}
        className="h-11 w-11 rounded-full bg-[var(--landing-champ-ctrl)] p-0 text-[#151A20] hover:bg-[var(--landing-champ-ctrl)]/90"
        disabled={disabled}
        onClick={onNext}
        type="button"
        variant="ghost"
      >
        <ArrowRight className="size-6" />
      </Button>
    </div>
  )
}
