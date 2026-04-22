import { FACE_IMAGE } from '../model'
import { type PlayerAvatarProps } from '../model'

export function PlayerAvatar({ face, size }: PlayerAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center overflow-hidden rounded-full"
      style={{ height: size, width: size }}
    >
      <img alt="" className="h-full w-full object-cover" src={FACE_IMAGE[face]} />
    </span>
  )
}
