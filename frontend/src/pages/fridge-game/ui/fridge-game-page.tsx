import React, { useState, useEffect } from "react";

// --- 1. Константы и типы (Вне компонента) ---
const ASSETS = {
  bg: "/dev-assets/images/game_background.jpg",
  fridge: "/dev-assets/images/big_fridge.svg",
  mascot: "/dev-assets/images/mascot_1.svg",
};

type GameState = "initial" | "bonus_added" | "finished";

interface Player {
  id: number;
  name: string;
  amount: number;
  isUser?: boolean;
}

// Вспомогательный компонент иконки (Вне рендера основного компонента)
const MascotIcon = () => (
  <img
    src={ASSETS.mascot}
    alt="ice"
    style={{
      width: 24,
      height: 24,
      marginRight: 8,
      display: "inline-block",
      verticalAlign: "middle",
    }}
  />
);

// --- 2. Основной компонент страницы ---
const FridgeGamePage: React.FC = () => {
  // --- Состояние ---
  const [gameState, setGameState] = useState<GameState>("initial");
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [bonusInput, setBonusInput] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [bank, setBank] = useState<number>(5000000);
  const [winChance, setWinChance] = useState<number>(20);

  // Данные таблицы лидеров
  const players: Player[] = [
    { id: 1, name: "Александр Ли", amount: 2100000 },
    { id: 2, name: "Андрей Леонов", amount: 1700000 },
    { id: 3, name: "Денис Колодцев", amount: 400000 },
    { id: 4, name: "Олег Долгов", amount: 220000 },
    { id: 5, name: "Дмитрий Никифоров", amount: 100000 },
    { id: 6, name: "Вы", amount: 100000, isUser: true },
  ];

  // --- Логика ---
  const handleAddBonus = () => {
    if (!bonusInput) return;
    setGameState("bonus_added");
    setBank(5100000);
    setWinChance(30);
  };

  const handleCellClick = (id: number) => {
    if (gameState === "bonus_added" && selectedCell === null) {
      setSelectedCell(id);
      setTimeLeft(5); // Устанавливаем 5 секунд до конца при выборе
    }
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    // Запускаем таймер только если выбрана ячейка
    if (gameState === "bonus_added" && selectedCell !== null && timeLeft > 0) {
      intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalId);
            setGameState("finished");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameState, selectedCell, timeLeft]);

  const formatMoney = (val: number) => val.toLocaleString("ru-RU") + " ₽";

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${ASSETS.bg})` }}>
      <div style={styles.overlay} />

      {/* Верхний таймер */}
      <div style={styles.timerHeader}>
        До конца: 00:{timeLeft.toString().padStart(2, "0")}
      </div>

      <div style={styles.mainContent}>
        {/* Левая часть: Холодильник */}
        <div style={styles.fridgeWrapper}>
          <h2 style={styles.instruction}>
            Выбери ту часть, которая тебе нравится
          </h2>
          <div
            style={{
              ...styles.fridgeGrid,
              backgroundImage: `url(${ASSETS.fridge})`,
            }}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <div
                key={num}
                onClick={() => handleCellClick(num)}
                style={{
                  ...styles.cell,
                  backgroundColor:
                    selectedCell === num ? "#FF008A" : "rgba(255, 0, 138, 0.1)",
                  cursor:
                    gameState === "bonus_added" && selectedCell === null
                      ? "pointer"
                      : "default",
                  opacity:
                    selectedCell !== null && selectedCell !== num ? 0.5 : 1,
                }}
              >
                {num}
              </div>
            ))}
          </div>
        </div>

        {/* Центральная часть: Статистика */}
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
            <span
              style={{
                ...styles.mainValue,
                color: gameState === "bonus_added" ? "#7CFF01" : "#fff",
              }}
            >
              {gameState === "bonus_added" ? "10%" : "0%"}
            </span>
          </div>

          <div style={styles.statBox}>
            <span style={styles.label}>Купили бонус</span>
            <span style={styles.mainValue}>2</span>
          </div>

          <div style={styles.actionContainer}>
            {gameState === "initial" ? (
              <div style={styles.inputWrapper}>
                <MascotIcon />
                <input
                  type="number"
                  placeholder="Цена бонуса..."
                  value={bonusInput}
                  onChange={(e) => setBonusInput(e.target.value)}
                  style={styles.input}
                />
                <button onClick={handleAddBonus} style={styles.plusBtn}>
                  +
                </button>
              </div>
            ) : (
              <div style={styles.activeBonusBar}>
                <MascotIcon />
              </div>
            )}
          </div>
        </div>

        {/* Правая часть: Аватары */}
        <div style={styles.sidebar}>
          <div style={styles.navArrow}>▲</div>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={styles.avatarBorder}>
              <img
                src={`https://i.pravatar.cc/100?u=${n}`}
                alt="user"
                style={styles.avatar}
              />
            </div>
          ))}
          <div style={styles.navArrow}>▼</div>
        </div>
      </div>

      {/* Финальное модальное окно */}
      {gameState === "finished" && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>
              Общий банк:{" "}
              <span style={{ color: "#FFD700" }}>{formatMoney(bank)}</span>
            </h3>
            <div style={styles.leaderboard}>
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  style={p.isUser ? styles.rowUser : styles.rowPlayer}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ marginRight: 10 }}>{idx + 1}</span>
                    {p.isUser && <MascotIcon />}
                    <span>{p.name}</span>
                  </div>
                  <span>{formatMoney(p.amount)}</span>
                </div>
              ))}
            </div>
            <div style={styles.btnGroup}>
              <button
                style={styles.restartBtn}
                onClick={() => window.location.reload()}
              >
                Начать снова
              </button>
              <button style={styles.exitBtn}>Выйти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- 3. Стили (Объект) ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: "100vw",
    height: "100vh",
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 0,
  },
  timerHeader: {
    zIndex: 1,
    marginTop: 20,
    background: "rgba(0,0,0,0.85)",
    padding: "8px 24px",
    borderRadius: "12px",
    fontSize: "20px",
    fontWeight: "bold",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  mainContent: {
    zIndex: 1,
    display: "flex",
    width: "95%",
    maxWidth: "1300px",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  fridgeWrapper: {
    width: "420px",
    textAlign: "center",
  },
  instruction: {
    fontSize: "18px",
    marginBottom: "20px",
    fontWeight: "normal",
    opacity: 0.9,
  },
  fridgeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "15px",
    padding: "70px 40px",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    minHeight: "520px",
  },
  cell: {
    height: "65px",
    border: "2px solid #FF008A",
    borderRadius: "10px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "22px",
    fontWeight: "bold",
    transition: "all 0.2s ease",
  },
  infoPanel: {
    width: "420px",
    background: "rgba(15, 15, 15, 0.8)",
    backdropFilter: "blur(20px)",
    borderRadius: "32px",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  statBox: { textAlign: "center" },
  label: {
    opacity: 0.6,
    fontSize: "14px",
    marginBottom: "4px",
    display: "block",
  },
  bankValue: {
    display: "block",
    fontSize: "38px",
    color: "#FFD700",
    fontWeight: 800,
  },
  mainValue: { display: "block", fontSize: "32px", fontWeight: 700 },
  subLabel: { fontSize: "12px", opacity: 0.4 },
  actionContainer: { marginTop: "10px" },
  inputWrapper: {
    display: "flex",
    alignItems: "center",
    background: "#111",
    borderRadius: "16px",
    padding: "6px 10px",
    border: "1px solid #333",
  },
  input: {
    background: "transparent",
    border: "none",
    color: "#fff",
    flex: 1,
    padding: "12px",
    outline: "none",
    fontSize: "16px",
  },
  plusBtn: {
    background: "#FF008A",
    border: "none",
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "24px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  activeBonusBar: {
    background: "#B4F05A",
    height: "56px",
    borderRadius: "16px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  sidebar: {
    background: "rgba(0,0,0,0.75)",
    padding: "20px 12px",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  avatarBorder: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    border: "2.5px solid #FF008A",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%", objectFit: "cover" },
  navArrow: { textAlign: "center", opacity: 0.4, fontSize: "12px" },
  modalBackdrop: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    backdropFilter: "blur(5px)",
  },
  modalCard: {
    width: "580px",
    background: "#0a0a0a",
    padding: "40px",
    borderRadius: "28px",
    border: "1px solid #222",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
  },
  modalTitle: { textAlign: "center", marginBottom: "32px", fontSize: "26px" },
  leaderboard: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "32px",
  },
  rowPlayer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "14px 20px",
    borderBottom: "1px solid #1a1a1a",
  },
  rowUser: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px 20px",
    background: "#B4F05A",
    color: "#000",
    borderRadius: "14px",
    fontWeight: "bold",
  },
  btnGroup: { display: "flex", gap: "16px", justifyContent: "center" },
  restartBtn: {
    background: "#FF008A",
    color: "#fff",
    padding: "16px 32px",
    border: "none",
    borderRadius: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
  exitBtn: {
    background: "#222",
    color: "#fff",
    padding: "16px 32px",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    fontSize: "16px",
  },
};

export default FridgeGamePage;
