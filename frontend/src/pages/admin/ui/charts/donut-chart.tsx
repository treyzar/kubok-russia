type DonutSlice = {
  label: string
  value: number
  color: string
}

type DonutChartProps = {
  slices: DonutSlice[]
  centerLabel?: string
  centerValue?: string
  size?: number
}

export function DonutChart({ slices, centerLabel, centerValue, size = 180 }: DonutChartProps) {
  const total = slices.reduce((acc, s) => acc + s.value, 0)
  const radius = size / 2
  const stroke = size * 0.18
  const r = radius - stroke / 2
  const c = 2 * Math.PI * r
  let offset = 0
  const isEmpty = total === 0

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={radius} cy={radius} r={r} fill="none" stroke="#F2F3F5" strokeWidth={stroke} />
          {!isEmpty &&
            slices.map((s) => {
              const ratio = s.value / total
              const length = c * ratio
              const dasharray = `${length} ${c - length}`
              const dashoffset = -offset
              offset += length
              return (
                <circle
                  key={s.label}
                  cx={radius}
                  cy={radius}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                  strokeLinecap="butt"
                />
              )
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[22px] font-black text-[#111]">{centerValue ?? total.toLocaleString('ru-RU')}</p>
            {centerLabel ? <p className="text-[11px] font-semibold text-[#7B7B7B]">{centerLabel}</p> : null}
          </div>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {slices.map((s) => {
          const pct = total === 0 ? 0 : (s.value / total) * 100
          return (
            <li key={s.label} className="flex items-center justify-between gap-3 text-[13px]">
              <span className="inline-flex items-center gap-2 truncate font-semibold text-[#111]">
                <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
                {s.label}
              </span>
              <span className="shrink-0 text-[#7B7B7B]">
                <span className="font-bold text-[#111]">{s.value.toLocaleString('ru-RU')}</span>
                <span className="ml-1.5 text-[11px]">· {pct.toFixed(0)}%</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
