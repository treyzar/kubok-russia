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

const NAV_LINKS = ['Лотереи', 'Моментальные', 'Акции', 'Результаты'] as const

export function AppHeader({
  user,
  onBrandClick,
  onLogout,
  onOpenAdmin,
  className,
  contentClassName,
}: AppHeaderProps) {
  const navigate = useNavigate()
  const isAdmin = user.role === 'ADMIN'

  function handleOpenAdmin() {
    if (onOpenAdmin) onOpenAdmin()
    else navigate('/admin')
  }

  const brand = (
    <>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFD400] text-[#111] shadow-[0_4px_12px_rgba(255,212,0,0.4)]">
        <span className="text-[18px] font-black leading-none">Н</span>
      </span>
      <span className="text-[20px] leading-none font-black tracking-[0.04em] text-[#111] sm:text-[22px]">
        НОЧНОЙ&nbsp;ЖОР
      </span>
    </>
  )

  return (
    <header className={cn('border-b border-[#ECECEC] bg-white', className)}>
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

        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link}
              type="button"
              className="cursor-pointer text-[15px] font-semibold text-[#3A3A3A] transition hover:text-[#111]"
            >
              {link}
            </button>
          ))}
        </nav>

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
