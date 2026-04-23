import { formatMoney } from '../lib'
import { PLAYERS } from '../model/constants'
import { styles } from '../model/styles'
import { MascotIcon } from './mascot-icon'

type LeaderboardModalProps = {
  bank: number
  onRestart: () => void
}

export function LeaderboardModal({ bank, onRestart }: LeaderboardModalProps) {
  return (
    <div style={styles.modalBackdrop}>
      <div style={styles.modalCard}>
        <h3 style={styles.modalTitle}>
          Итог: <span style={{ color: '#FFD700' }}>{formatMoney(bank)}</span>
        </h3>
        <div style={styles.leaderboard}>
          {PLAYERS.map((player, idx) => (
            <div key={player.id} style={player.isUser ? styles.rowUser : styles.rowPlayer}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ marginRight: 10 }}>{idx + 1}</span>
                {player.isUser && <MascotIcon />}
                <span>{player.name}</span>
              </div>
              <span>{formatMoney(player.amount)}</span>
            </div>
          ))}
        </div>
        <div style={styles.btnGroup}>
          <button onClick={onRestart} style={styles.restartBtn} type="button">
            Начать снова
          </button>
          <button style={styles.exitBtn} type="button">
            Выйти
          </button>
        </div>
      </div>
    </div>
  )
}
