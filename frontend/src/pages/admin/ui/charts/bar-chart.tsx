type BarItem = {
  label: string
  value: number
  hint?: string
}

type BarChartProps = {
  items: BarItem[]
  emptyText?: string
  valueFormatter?: (value: number) => string
}

export function BarChart({ items, emptyText = 'Нет данных', valueFormatter }: BarChartProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[#9A9A9A]">{emptyText}</p>
  }
  const max = Math.max(...items.map((i) => i.value), 1)
  const fmt = valueFormatter ?? ((v: number) => v.toLocaleString('ru-RU'))
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const ratio = item.value / max
        return (
          <li key={item.label} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate font-semibold text-[#111]">{item.label}</span>
              <span className="shrink-0 text-[#7B7B7B]">
                <span className="font-bold text-[#111]">{fmt(item.value)}</span>
                {item.hint ? <span className="ml-1.5 text-[11px]">{item.hint}</span> : null}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F2F3F5]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFC400] to-[#FF7A00] transition-all duration-700"
                style={{ width: `${Math.max(4, ratio * 100)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
