import { ASSETS } from '../model/constants'

export function MascotIcon() {
  return (
    <img
      alt="ice"
      src={ASSETS.mascot}
      style={{ width: 24, height: 24, marginRight: 8, display: 'inline-block', verticalAlign: 'middle' }}
    />
  )
}
