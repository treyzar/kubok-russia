import { Button } from '@shared/ui'
import { BACKGROUND_OPTIONS } from '../model/constants'
import type { BackgroundPickerProps } from '../model/types'

export function BackgroundPicker({ value, onChange }: BackgroundPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {BACKGROUND_OPTIONS.map((option) => (
        <Button
          className={`h-[46px] rounded-[12px] text-[16px] font-medium ${
            value === option.value
              ? 'bg-[#FF1493] text-white hover:bg-[#FF2BA1] hover:text-white hover:shadow-[0_12px_24px_rgba(255,20,147,0.45)]'
              : 'border border-[#363B4A] bg-[#17181D] text-[#ECEEF4] hover:bg-[#1E2027] hover:text-[#ECEEF4] hover:shadow-[0_10px_20px_rgba(8,10,16,0.44)]'
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
