import { Input } from '@shared/ui'
import { type ConfigFieldProps } from '../model'

export function ConfigField({ label, value, onChange }: ConfigFieldProps) {
  return (
    <label className="space-y-1">
      <span className="text-sm text-[#A5ADC1]">{label}</span>
      <Input
        className="h-[44px] rounded-[10px] border-[#364050] bg-[#141821]"
        onChange={(e) => onChange(e.target.value)}
        type="number"
        value={value}
      />
    </label>
  )
}
