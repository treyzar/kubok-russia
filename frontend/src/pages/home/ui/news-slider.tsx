import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@shared/ui'
import { newsSlides } from '../model/constants'
import { useNewsSlider } from '../lib'

export function NewsSlider() {
  const {
    slideIndex,
    incomingSlideIndex,
    transitionDirection,
    isTransitionActive,
    activeIndicatorIndex,
    slideTransitionStyle,
    finishTransition,
    switchSlide,
    selectSlide,
  } = useNewsSlider()

  return (
    <div>
      <div className="mt-3 overflow-hidden rounded-[8px] border border-[#2D2E33]">
        <div className="relative h-[220px]">
          {newsSlides.map((slide, index) => {
            const isCurrentSlide = index === slideIndex
            const isIncomingSlide = incomingSlideIndex !== null && index === incomingSlideIndex
            const isOutgoingSlide = incomingSlideIndex !== null && isCurrentSlide

            const layerClass = (() => {
              if (isIncomingSlide) {
                return isTransitionActive
                  ? 'z-30 translate-x-0 opacity-100'
                  : transitionDirection === 1
                    ? 'z-30 translate-x-1 opacity-0'
                    : 'z-30 -translate-x-1 opacity-0'
              }
              if (isOutgoingSlide) {
                return isTransitionActive
                  ? transitionDirection === 1
                    ? 'z-20 -translate-x-1 opacity-0'
                    : 'z-20 translate-x-1 opacity-0'
                  : 'z-20 translate-x-0 opacity-100'
              }
              if (isCurrentSlide) return 'z-10 translate-x-0 opacity-100'
              return 'z-0 translate-x-0 opacity-0'
            })()

            return (
              <div
                className={`absolute inset-0 transform-gpu transition-[transform,opacity] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] ${layerClass}`}
                key={slide.id}
                onTransitionEnd={(e) => {
                  if (
                    e.target !== e.currentTarget ||
                    !isIncomingSlide ||
                    incomingSlideIndex === null ||
                    !isTransitionActive
                  ) return
                  if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return
                  finishTransition(incomingSlideIndex)
                }}
                style={slideTransitionStyle}
              >
                <img alt={slide.alt} className="h-full w-full object-cover object-top" loading="eager" src={slide.image} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Button
          aria-label="Предыдущая новость"
          className="h-9 w-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] p-0"
          onClick={() => switchSlide(-1)}
          type="button"
          variant="outline"
        >
          <ArrowLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-2">
          {newsSlides.map((slide, index) => (
            <button
              aria-label={`Перейти к слайду ${index + 1}`}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                activeIndicatorIndex === index ? 'w-4 bg-[#E7E8EC]' : 'bg-[#75757C] hover:bg-[#9FA0A9]'
              }`}
              key={slide.id}
              onClick={() => selectSlide(index)}
              type="button"
            />
          ))}
        </div>

        <Button
          aria-label="Следующая новость"
          className="h-9 w-9 rounded-[8px] border border-[#3A3B42] bg-[#1A1B21] p-0"
          onClick={() => switchSlide(1)}
          type="button"
          variant="outline"
        >
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
