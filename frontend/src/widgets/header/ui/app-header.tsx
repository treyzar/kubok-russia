import { Bell, ChevronDown, LogOut, ShieldCheck, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { formatUserBalance } from '@entities/user'
import { cn } from '@shared/lib'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/ui'

import { type AppHeaderProps } from '../model/types'

const DEFAULT_BRAND = {
  name: 'НОЧНОЙ ЖОР',
  letter: 'Н',
  from: '#FFD400',
  to: '#FFB300',
}

export function AppHeader({
  user,
  onBrandClick,
  onLogout,
  onOpenAdmin,
  activeMechanic,
  liveStatusText,
  className,
  contentClassName,
}: AppHeaderProps) {
  const navigate = useNavigate()
  const isAdmin = user.role === 'ADMIN'
  const brandData = activeMechanic ?? DEFAULT_BRAND

  function handleOpenAdmin() {
    if (onOpenAdmin) onOpenAdmin()
    else navigate('/admin')
  }

  const brand = (
    <>
      <span
        className="relative grid h-10 w-10 place-items-center rounded-full text-white shadow-[0_4px_14px_rgba(16,24,40,0.18)] transition-all duration-500"
        style={{ background: `linear-gradient(135deg, ${brandData.from}, ${brandData.to})` }}
      >
        {activeMechanic?.Icon ? (
          <activeMechanic.Icon className="size-5" />
        ) : (
          <span className="text-[18px] font-black leading-none">{brandData.letter}</span>
        )}
        <span className="pointer-events-none absolute inset-x-1 top-1 h-1/2 rounded-full bg-white/30 blur-[2px]" />
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[20px] font-black tracking-[0.04em] text-[#111] transition-colors duration-300 sm:text-[22px]">
          {brandData.name}
        </span>
        {activeMechanic?.badge ? (
          <span
            className={cn(
              'mt-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
              activeMechanic.badgeBg ?? 'bg-[#111] text-white',
            )}
          >
            {activeMechanic.badge}
          </span>
        ) : null}
      </span>
    </>
  )

  return (
    <header className={cn('border-b border-black/5 bg-white/85 backdrop-blur', className)}>
      <div
        className={cn(
          'mx-auto flex w-full max-w-[1280px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8',
          contentClassName,
        )}
      >
        {onBrandClick ? (
          <button
            aria-label="На главную"
            className="inline-flex items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
            onClick={onBrandClick}
            type="button"
          >
            {brand}
          </button>
        ) : (
          <div className="inline-flex items-center gap-3">{brand}</div>
        )}

        {/* Center area — useful live status (no broken nav links). */}
        {liveStatusText ? (
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3.5 py-1.5 text-[12.5px] font-semibold text-[#3A3A3A] shadow-[0_2px_10px_rgba(16,24,40,0.04)]">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E5008C] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[#E5008C]" />
              </span>
              {liveStatusText}
            </span>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            className="hidden h-11 gap-2 rounded-full border-[#ECECEC] bg-[#F5F6F7] px-4 text-[15px] font-semibold text-[#111] shadow-none hover:bg-[#EFF0F2] sm:inline-flex"
            type="button"
            variant="outline"
          >
            <Wallet className="size-4 text-[#111]" />
            {formatUserBalance(user.balance)}
          </Button>

          <Button
            aria-label="Уведомления"
            className="h-11 w-11 rounded-full border-[#ECECEC] bg-white p-0 text-[#111] shadow-none hover:bg-[#F5F6F7]"
            type="button"
            variant="outline"
          >
            <Bell className="size-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="group h-11 gap-2 rounded-full border-[#ECECEC] bg-white px-2.5 text-[14px] font-semibold text-[#111] shadow-none hover:bg-[#F5F6F7]"
                type="button"
                variant="outline"
              >
                <Avatar className="size-7">
                  <AvatarImage alt={user.name} src="/dev-assets/images/card_with_peoples.svg" />
                  <AvatarFallback className="bg-[#FFD400] text-[#111]">
                    {user.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[140px] truncate">{user.name}</span>
                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[260px] rounded-2xl border-[#ECECEC] bg-white p-1.5 text-[#111] shadow-[0_12px_28px_rgba(16,24,40,0.12)]"
              sideOffset={8}
            >
              <div className="px-3 pt-2 pb-1.5">
                <p className="text-[14px] font-semibold leading-tight">{user.name}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[#7B7B7B]">{user.displayRole}</p>
              </div>
              {isAdmin ? (
                <DropdownMenuItem
                  className="cursor-pointer gap-2 rounded-xl px-3 py-2 text-[14px] font-medium text-[#111] hover:bg-[#FFF6CC] focus:bg-[#FFF6CC]"
                  onClick={handleOpenAdmin}
                >
                  <ShieldCheck className="size-4 text-[#FFC400]" />
                  Админ-панель
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-xl px-3 py-2 text-[14px] font-medium text-[#111] hover:bg-[#F5F6F7] focus:bg-[#F5F6F7]"
                onClick={onLogout}
              >
                <LogOut className="size-4" />
                Выход из аккаунта
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
