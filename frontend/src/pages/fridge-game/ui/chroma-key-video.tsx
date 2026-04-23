import { useEffect, useRef } from 'react'
import { CHROMA_KEY_GREEN_MIN, CHROMA_KEY_THRESHOLD } from '../model/constants'
import { styles } from '../model/styles'

type ChromaKeyVideoProps = {
  src: string
  onEnded: () => void
}

export function ChromaKeyVideo({ src, onEnded }: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    let animationId: number

    function processFrame(): void {
      if (!video || !canvas || !ctx) return
      if (video.paused || video.ended) return

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const { data } = frame

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        if (g > CHROMA_KEY_GREEN_MIN && g > r * CHROMA_KEY_THRESHOLD && g > b * CHROMA_KEY_THRESHOLD) {
          data[i + 3] = 0
        }
      }

      ctx.putImageData(frame, 0, 0)
      animationId = requestAnimationFrame(processFrame)
    }

    video.onplay = () => {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      processFrame()
    }

    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      <video
        autoPlay
        muted
        onEnded={onEnded}
        playsInline
        ref={videoRef}
        src={src}
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} style={styles.canvas} />
    </div>
  )
}
