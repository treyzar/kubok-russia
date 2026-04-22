import { Bell, ChevronDown, CircleDollarSign, Plus, Send } from 'lucide-react'

import { formatUserBalance } from '@entities/user'
import { cn } from '@shared/lib'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@shared/ui'

import { type AppHeaderProps } from '../model/types'

const defaultContentClassName =
  'mx-auto grid w-full max-w-[1248px] grid-cols-1 items-center gap-3 px-3 py-3 sm:px-4 md:grid-cols-[1fr_auto_1fr] md:px-5 xl:px-0'

export function AppHeader({ user, onCreateGame, onBrandClick, className, contentClassName }: AppHeaderProps) {
  const brand = (
    <>
      <img alt="Ночной жор" className="h-[44px] w-[44px] rounded-full object-cover md:h-[46px] md:w-[46px]" src="/dev-assets/images/logo.svg" />
      <span className="text-[26px] leading-none font-bold tracking-[0.01em] sm:text-[30px] lg:text-[34px]">НОЧНОЙ ЖОР</span>
    </>
  )

  return (
    <header className={cn('border-b border-[#2A2B31] bg-[#1D1E23]', className)}>
      <div className={cn(defaultContentClassName, contentClassName)}>
        {onBrandClick ? (
          <button
            aria-label="Перейти на главную"
            className="inline-flex w-fit justify-self-start cursor-pointer items-center justify-center gap-3 rounded-[8px] border-0 bg-transparent px-1 py-1 text-[#F5F6F9] transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A8E45E] md:justify-start"
            onClick={onBrandClick}
            type="button"
          >
            {brand}
          </button>
        ) : (
          <div className="inline-flex items-center justify-center gap-3 text-[#F5F6F9] md:justify-start">{brand}</div>
        )}

        <div className="flex items-center justify-center gap-2">
          <Button
            className="h-[46px] gap-2 rounded-[8px] border border-[#F21795] bg-[#3B2254] px-3 text-[14px] font-semibold text-[#F0EAFB] hover:bg-[#4D2C6E] md:h-[52px] md:px-4 md:text-[16px]"
            type="button"
            variant="outline"
          >
            <CircleDollarSign className="size-4 text-[#7D3EFF]" />
            {formatUserBalance(user.balance)}
            <ChevronDown className="size-4" />
          </Button>
          <Button
            className="h-[46px] w-[46px] rounded-[8px] border border-[#FF1894] bg-[#FF1894] p-0 text-white hover:bg-[#FF2BA1] md:h-[52px] md:w-[52px]"
            onClick={onCreateGame}
            type="button"
          >
            <Plus className="size-6 md:size-7" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 md:justify-end">
          <Button
            className="h-[46px] gap-2 rounded-[8px] border border-[#7620F5] bg-[#2A1F44] px-2.5 text-[14px] text-[#F0ECFB] hover:bg-[#322453] md:h-[52px] md:px-3.5 md:text-[16px]"
            type="button"
            variant="outline"
          >
            <Avatar className="size-7">
              <AvatarImage alt={user.name} src="/dev-assets/images/card_with_peoples.svg" />
              <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span className="max-w-[130px] truncate font-semibold md:max-w-[170px]">{user.name}</span>
            <ChevronDown className="size-4" />
          </Button>
          <Button
            className="h-[46px] w-[46px] rounded-[8px] border border-[#3A3B42] bg-[#1C1D24] p-0 text-[#ECEEF4] hover:bg-[#252731] md:h-[52px] md:w-[52px]"
            type="button"
            variant="outline"
          >
            <Send className="size-5" />
          </Button>
          <Button
            className="h-[46px] w-[46px] rounded-[8px] border border-[#3A3B42] bg-[#1C1D24] p-0 text-[#ECEEF4] hover:bg-[#252731] md:h-[52px] md:w-[52px]"
            type="button"
            variant="outline"
          >
            <Bell className="size-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
