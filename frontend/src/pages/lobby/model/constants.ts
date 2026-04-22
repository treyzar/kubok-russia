import { type PlayerFace, type SidePlayer } from './types'

export const FACE_IMAGE: Record<PlayerFace, string> = {
  smile: '/dev-assets/images/man_1.svg',
  beard: '/dev-assets/images/man_2.svg',
}

export const SIDE_PLAYERS: SidePlayer[] = [
  { id: '1', top: '12.0%', right: '12.5%', face: 'smile' },
  { id: '2', top: '12.0%', right: '5.5%', face: 'smile' },
  { id: '3', top: '22.6%', right: '12.5%', face: 'beard' },
  { id: '4', top: '22.6%', right: '5.5%', face: 'smile' },
  { id: '5', top: '33.2%', right: '12.5%', face: 'smile' },
  { id: '6', top: '33.2%', right: '5.5%', face: 'smile' },
  { id: '7', top: '43.8%', right: '12.5%', face: 'beard' },
  { id: '8', top: '43.8%', right: '5.5%', face: 'smile' },
  { id: '9', top: '54.4%', right: '5.5%', face: 'smile' },
  { id: '10', top: '54.4%', right: '12.5%', face: 'beard' },
]
