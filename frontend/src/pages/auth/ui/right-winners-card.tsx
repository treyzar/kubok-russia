import { memo } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Card, CardContent, CardHeader, CardTitle } from '@shared/ui'
import { useCarousel } from '../lib'
import { WINNERS_VARIANTS } from '../model'
import { ChampionNavButtons } from './champion-nav-buttons'

export const RightWinnersCard = memo(function RightWinnersCard() {
  const { index, isSwitching, navigate } = useCarousel({ length: WINNERS_VARIANTS.length })
  const activeWinners = WINNERS_VARIANTS[index]

  return (
    <Card className="relative h-[488px] rounded-[20px] border-transparent bg-[var(--landing-champ-card)] shadow-none">
      <CardHeader className="px-6 py-6 pb-0 sm:px-7 sm:pt-7">
        <CardTitle className="text-[clamp(1.8rem,2.9vw,2.55rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
          Победители
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col px-6 pb-24 pt-3 sm:px-7">
        <div
          className={`flex flex-1 items-center -translate-y-4 transition-all duration-300 sm:-translate-y-5 lg:-translate-y-6 ${
            isSwitching ? 'translate-x-1 opacity-0' : 'translate-x-0 opacity-100'
          }`}
        >
          <div className="w-full space-y-6">
            {activeWinners.map((winner) => (
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5" key={winner.id}>
                <Avatar className="h-11 w-11 border-2 border-[#F52C9C] bg-[#F43A9E]">
                  <AvatarImage
                    alt={winner.name}
                    className="object-cover"
                    src="/dev-assets/images/card_with_peoples.svg"
                    style={{ objectPosition: winner.avatarPosition }}
                  />
                  <AvatarFallback className="bg-[#F43A9E] text-[0.62rem] font-semibold text-white">
                    {winner.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[clamp(1.2rem,1.9vw,1.75rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
                    {winner.name}
                  </p>
                  <p className="mt-1.5 truncate text-[clamp(1rem,1.6vw,1.45rem)] leading-none font-medium text-[var(--landing-champ-sub)]">
                    {winner.region}
                  </p>
                </div>
                <div className="min-w-[155px] text-right">
                  <p className="text-[clamp(1rem,1.5vw,1.3rem)] leading-none font-semibold text-[var(--landing-champ-muted)]">
                    Игра №{winner.id}
                  </p>
                  <p className="mt-1.5 text-[clamp(1.2rem,1.85vw,1.65rem)] leading-none font-semibold text-[var(--landing-champ-title)]">
                    {winner.prize}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ChampionNavButtons
          disabled={isSwitching}
          nextLabel="Следующие победители"
          onNext={() => navigate(1)}
          onPrev={() => navigate(-1)}
          prevLabel="Предыдущие победители"
        />
      </CardContent>
    </Card>
  )
})
