import { type UseFridgeGameOptions, useFridgeGame, formatMoney } from '../lib'
import { ASSETS, FRIDGE_CELLS_COUNT } from '../model/constants'
import { styles } from '../model/styles'
import { ChromaKeyVideo } from './chroma-key-video'
import { LeaderboardModal } from './leaderboard-modal'
import { MascotIcon } from './mascot-icon'

export function FridgeGamePage({ roomId, userId, userName, userBalance, onUserBalanceChange }: UseFridgeGameOptions) {
  const {
    gameState,
    selectedCell,
    bonusInput,
    setBonusInput,
    timeLeft,
    bank,
    winChance,
    buyBoostMutation,
    handleCellClick,
    handleVideoEnded,
    handleRestart,
    joinError,
    hasBoosted,
  } = useFridgeGame({ roomId, userId, userName, userBalance, onUserBalanceChange })

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${ASSETS.bg})` }}>
      <div style={styles.overlay} />

      {joinError && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', color: '#ff4444', background: 'rgba(0,0,0,0.7)', padding: '8px 16px', borderRadius: 8, zIndex: 100 }}>
          {joinError}
        </div>
      )}

      {gameState !== 'video' && (
        <div style={styles.timerHeader}>
          До конца: 00:{timeLeft.toString().padStart(2, '0')}
        </div>
      )}

      <div style={styles.mainContent}>
        {/* Fridge / Video */}
        <div style={styles.fridgeWrapper}>
          {gameState === 'video' ? (
            <div style={styles.videoContainer}>
              <ChromaKeyVideo onEnded={handleVideoEnded} src={ASSETS.introVideo} />
            </div>
          ) : (
            <>
              <h2 style={styles.instruction}>Выбери ту часть, которая тебе нравится</h2>
              <div style={{ ...styles.fridgeGrid, backgroundImage: `url(${ASSETS.fridge})` }}>
                {Array.from({ length: FRIDGE_CELLS_COUNT }, (_, i) => i + 1).map((num) => (
                  <div
                    key={num}
                    onClick={() => handleCellClick(num)}
                    style={{
                      ...styles.cell,
                      backgroundColor: selectedCell === num ? '#FF008A' : 'rgba(255, 0, 138, 0.1)',
                      cursor: gameState === 'bonus_added' && selectedCell === null ? 'pointer' : 'default',
                      opacity: selectedCell !== null && selectedCell !== num ? 0.3 : 1,
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Info panel */}
        <div style={styles.infoPanel}>
          <div style={styles.statBox}>
            <span style={styles.label}>Общий банк</span>
            <span style={styles.bankValue}>{formatMoney(bank)}</span>
            <span style={styles.subLabel}>(3 000 000 + 2 100 000)</span>
          </div>

          <div style={styles.statBox}>
            <span style={styles.label}>Шанс твоей победы</span>
            <span style={styles.mainValue}>{winChance}%</span>
          </div>

          <div style={styles.statBox}>
            <span style={styles.label}>Плюс от бонуса</span>
            <span style={{ ...styles.mainValue, color: gameState === 'bonus_added' ? '#7CFF01' : '#fff' }}>
              {gameState === 'bonus_added' ? '10%' : '0%'}
            </span>
          </div>

          <div style={styles.statBox}>
            <span style={styles.label}>Купили бонус</span>
            <span style={styles.mainValue}>2</span>
          </div>

          <div style={styles.actionContainer}>
            {gameState === 'video' && (
              <div style={{ textAlign: 'center', opacity: 0.5 }}>Смотрим интро...</div>
            )}
            {gameState === 'initial' && !hasBoosted && (
              <div style={styles.inputWrapper}>
                <MascotIcon />
                <input
                  onChange={(e) => setBonusInput(e.target.value)}
                  placeholder="Цена бонуса..."
                  style={styles.input}
                  type="number"
                  value={bonusInput}
                />
                <button
                  onClick={() => buyBoostMutation.mutate()}
                  style={styles.plusBtn}
                  type="button"
                  disabled={buyBoostMutation.isPending}
                >
                  +
                </button>
              </div>
            )}
            {gameState === 'bonus_added' && (
              <div style={styles.activeBonusBar}>
                <MascotIcon />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar avatars */}
        <div style={styles.sidebar}>
          <div style={styles.navArrow}>▲</div>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={styles.avatarBorder}>
              <img alt="user" src={`https://i.pravatar.cc/100?u=${n}`} style={styles.avatar} />
            </div>
          ))}
          <div style={styles.navArrow}>▼</div>
        </div>
      </div>

      {gameState === 'finished' && <LeaderboardModal bank={bank} onRestart={handleRestart} />}
    </div>
  )
}
