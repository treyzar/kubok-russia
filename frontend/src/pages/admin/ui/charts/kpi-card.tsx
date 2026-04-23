import type { LucideIcon } from 'lucide-react'

type KpiTone = 'yellow' | 'green' | 'purple' | 'blue' | 'pink'

const TONES: Record<KpiTone, { tile: string; iconBg: string; iconColor: string; accent: string }> = {
  yellow: { tile: 'from-[#FFF7CF] to-[#FFE680]', iconBg: 'bg-[#FFD400]', iconColor: 'text-[#111]', accent: 'text-[#A07700]' },
  green: { tile: 'from-[#E6F8EE] to-[#BFEFCF]', iconBg: 'bg-[#1AB75A]', iconColor: 'text-white', accent: 'text-[#0F7A3A]' },
  purple: { tile: 'from-[#F1E8FF] to-[#D6BFFF]', iconBg: 'bg-[#7A37F0]', iconColor: 'text-white', accent: 'text-[#4F1FB3]' },
  blue: { tile: 'from-[#E6F0FF] to-[#BFD7FF]', iconBg: 'bg-[#2F6FE8]', iconColor: 'text-white', accent: 'text-[#1A4FB0]' },
  pink: { tile: 'from-[#FFE8F4] to-[#FFC0DE]', iconBg: 'bg-[#E5008C]', iconColor: 'text-white', accent: 'text-[#A30062]' },
}

type KpiCardProps = {
  label: string
  value: string
  hint?: string
  Icon: LucideIcon
  tone?: KpiTone
}

export function KpiCard({ label, value, hint, Icon, tone = 'yellow' }: KpiCardProps) {
  const t = TONES[tone]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#ECECEC] bg-white p-4 shadow-[0_2px_12px_rgba(16,24,40,0.04)]">
      <div className={`pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br ${t.tile} opacity-70 blur-xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7B7B7B]">{label}</p>
          <p className="mt-1.5 text-[26px] font-black leading-tight text-[#111]">{value}</p>
          {hint ? <p className={`mt-0.5 text-[12px] font-semibold ${t.accent}`}>{hint}</p> : null}
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${t.iconBg}`}>
          <Icon className={`size-5 ${t.iconColor}`} />
        </span>
      </div>
    </div>
  )
}
