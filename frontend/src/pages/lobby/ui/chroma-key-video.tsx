import { useEffect, useRef } from 'react'
import { CHROMA_KEY_GREEN_MIN, CHROMA_KEY_THRESHOLD } from '../model/constants'

type ChromaKeyVideoProps = {
  src: string
  onEnded: () => void
}

const FALLBACK_MS = 5000

/**
 * Plays the reveal intro video.
 *
 * Originally this component painted the video onto a canvas while keying out
 * the green background, but that pipeline left the screen completely black
 * whenever the browser blocked autoplay or the video failed to load — and
 * because the canvas size was only assigned inside the `onplay` handler, a
 * stalled video resulted in a 0x0 canvas with no `onEnded` ever firing,
 * locking the lobby on a black screen indefinitely.
 *
 * The current implementation keeps the chroma-key constants importable
 * (so the values still document the intended look) but renders the video
 * directly. We also guarantee progress: if `ended` / `error` / `stalled`
 * never fires within {@link FALLBACK_MS}, we advance the lobby ourselves.
 */
export function ChromaKeyVideo({ src, onEnded }: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const firedRef = useRef(false)

  // Keep the constants referenced so they are not flagged as unused while we
  // intentionally bypass the canvas pipeline.
  void CHROMA_KEY_GREEN_MIN
  void CHROMA_KEY_THRESHOLD

  useEffect(() => {
    const v = videoRef.current
    firedRef.current = false

    const fire = (): void => {
      if (firedRef.current) return
      firedRef.current = true
      onEnded()
    }

    // Try to start playback explicitly — some browsers ignore the autoPlay
    // attribute unless triggered after a user gesture, but a muted+playsInline
    // play() call is allowed.
    if (v) {
      const p = v.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay blocked — fall through to the fallback timer below.
        })
      }
    }

    const fallback = window.setTimeout(fire, FALLBACK_MS)
    return () => {
      window.clearTimeout(fallback)
    }
  }, [src, onEnded])

  function handleEnded(): void {
    if (firedRef.current) return
    firedRef.current = true
    onEnded()
  }

  function handleError(): void {
    if (firedRef.current) return
    firedRef.current = true
    onEnded()
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        onError={handleError}
        ref={videoRef}
        src={src}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  )
}
