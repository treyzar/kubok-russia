import React, { useState, useEffect, useRef } from "react";

// --- 1. КОНФИГУРАЦИЯ АССЕТОВ ---
const ASSETS = {
  bg: "/dev-assets/images/game_background.jpg",
  fridge: "/dev-assets/images/logo-fridge.png",
  mascot: "/dev-assets/images/mascot_1.svg",
  introVideo: "/dev-assets/videos/intro.mp4",
};

// --- 2. ТИПЫ ---
type GameState = "video" | "initial" | "bonus_added" | "finished";

interface Player {
  id: number;
  name: string;
  amount: number;
  isUser?: boolean;
}

// --- 3. КОМПОНЕНТ ХРОМАКЕЯ (Canvas) ---
const ChromaKeyVideo: React.FC<{ src: string; onEnded: () => void }> = ({
  src,
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let animationId: number;

    const processFrame = () => {
      if (video.paused || video.ended) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const length = frame.data.length;

      for (let i = 0; i < length; i += 4) {
        const r = frame.data[i];
        const g = frame.data[i + 1];
        const b = frame.data[i + 2];

        // Убираем зеленый фон (регулируй 1.3 если вырезает слишком много или мало)
        if (g > 80 && g > r * 1.3 && g > b * 1.3) {
          frame.data[i + 3] = 0;
        }
      }

      ctx.putImageData(frame, 0, 0);
      animationId = requestAnimationFrame(processFrame);
    };

    video.onplay = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      processFrame();
    };

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
      }}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        autoPlay
        onEnded={onEnded}
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
};

// --- 4. ВСПОМОГАТЕЛЬНЫЕ ЭЛЕМЕНТЫ ---
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

// --- 5. ОСНОВНОЙ КОМПОНЕНТ ---
const FridgeGamePage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>("video");
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [bonusInput, setBonusInput] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [bank, setBank] = useState<number>(5000000);
  const [winChance, setWinChance] = useState<number>(20);

  const players: Player[] = [
    { id: 1, name: "Александр Ли", amount: 2100000 },
    { id: 2, name: "Андрей Леонов", amount: 1700000 },
    { id: 3, name: "Денис Колодцев", amount: 400000 },
    { id: 4, name: "Олег Долгов", amount: 220000 },
    { id: 5, name: "Дмитрий Никифоров", amount: 100000 },
    { id: 6, name: "Вы", amount: 100000, isUser: true },
  ];

  const handleAddBonus = () => {
    if (!bonusInput) return;
    setGameState("bonus_added");
    setBank(5100000);
    setWinChance(30);
  };

  const handleCellClick = (id: number) => {
    if (gameState === "bonus_added" && selectedCell === null) {
      setSelectedCell(id);
      setTimeLeft(5);
    }
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (gameState === "bonus_added" && selectedCell !== null && timeLeft > 0) {
      intervalId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState("finished");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [gameState, selectedCell, timeLeft]);

  const formatMoney = (val: number) => val.toLocaleString("ru-RU") + " ₽";

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${ASSETS.bg})` }}>
      <div style={styles.overlay} />

      {/* Timer Header */}
      {gameState !== "video" && (
        <div style={styles.timerHeader}>
          До конца: 00:{timeLeft.toString().padStart(2, "0")}
        </div>
      )}

      <div style={styles.mainContent}>
        {/* Left Side: Video or Fridge */}
        <div style={styles.fridgeWrapper}>
          {gameState === "video" ? (
            <div style={styles.videoContainer}>
              <ChromaKeyVideo
                src={ASSETS.introVideo}
                onEnded={() => setGameState("initial")}
              />
            </div>
          ) : (
            <>
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
                        selectedCell === num
                          ? "#FF008A"
                          : "rgba(255, 0, 138, 0.1)",
                      cursor:
                        gameState === "bonus_added" && selectedCell === null
                          ? "pointer"
                          : "default",
                      opacity:
                        selectedCell !== null && selectedCell !== num ? 0.3 : 1,
                    }}
                  >
                    {num}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Info Panel */}
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
            {gameState === "video" ? (
              <div style={{ textAlign: "center", opacity: 0.5 }}>
                Смотрим интро...
              </div>
            ) : gameState === "initial" ? (
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

        {/* Sidebar */}
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

      {/* Leaderboard Modal */}
      {gameState === "finished" && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <h3 style={styles.modalTitle}>
              Итог:{" "}
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

// --- 6. ПОЛНЫЙ ОБЪЕКТ СТИЛЕЙ ---
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
    fontFamily: "Inter, system-ui, sans-serif",
    overflowY: "auto",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 0,
  },
  timerHeader: {
    zIndex: 1,
    marginTop: 20,
    background: "rgba(0,0,0,0.85)",
    padding: "10px 25px",
    borderRadius: "14px",
    fontSize: "20px",
    fontWeight: "bold",
    border: "1px solid rgba(255,255,255,0.1)",
  },
  mainContent: {
    zIndex: 1,
    display: "flex",
    width: "95%",
    maxWidth: "1700px",
    justifyContent: "space-around",
    alignItems: "center",
    flex: 1,
    gap: "40px",
  },
  fridgeWrapper: { width: "800px", textAlign: "center" },
  videoContainer: {
    width: "100%",
    minHeight: "600px",
    background: "transparent",
    borderRadius: "32px",
    overflow: "hidden",
  },
  instruction: {
    fontSize: "24px",
    marginBottom: "20px",
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  fridgeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 140px)",
    gap: "20px",
    padding: "40px",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    minHeight: "1000px",
    justifyContent: "center",
    alignContent: "center",
  },
  cell: {
    height: "65px",
    width: "130px",
    border: "2px solid #FF008A",
    borderRadius: "12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "24px",
    fontWeight: "bold",
    transition: "0.2s",
  },
  infoPanel: {
    width: "420px",
    background: "rgba(10, 10, 10, 0.8)",
    backdropFilter: "blur(25px)",
    borderRadius: "32px",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  statBox: { textAlign: "center" },
  label: { opacity: 0.5, fontSize: "14px", textTransform: "uppercase" },
  bankValue: {
    display: "block",
    fontSize: "42px",
    color: "#FFD700",
    fontWeight: 900,
  },
  mainValue: { display: "block", fontSize: "34px", fontWeight: 800 },
  subLabel: { fontSize: "13px", opacity: 0.4 },
  actionContainer: { marginTop: "10px" },
  inputWrapper: {
    display: "flex",
    alignItems: "center",
    background: "#181818",
    borderRadius: "18px",
    padding: "8px 12px",
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
    width: "48px",
    height: "48px",
    borderRadius: "14px",
    color: "#fff",
    fontSize: "28px",
    cursor: "pointer",
  },
  activeBonusBar: {
    background: "#B4F05A",
    height: "60px",
    borderRadius: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 0 20px rgba(180, 240, 90, 0.3)",
  },
  sidebar: {
    background: "rgba(0,0,0,0.8)",
    padding: "24px 14px",
    borderRadius: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  avatarBorder: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    border: "3px solid #FF008A",
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%", objectFit: "cover" },
  navArrow: { textAlign: "center", opacity: 0.4, fontSize: "14px" },
  modalBackdrop: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.92)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
    backdropFilter: "blur(10px)",
  },
  modalCard: {
    width: "600px",
    background: "#050505",
    padding: "45px",
    borderRadius: "32px",
    border: "1px solid #222",
  },
  modalTitle: { textAlign: "center", marginBottom: "35px", fontSize: "28px" },
  leaderboard: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "35px",
  },
  rowPlayer: {
    display: "flex",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: "1px solid #151515",
  },
  rowUser: {
    display: "flex",
    justifyContent: "space-between",
    padding: "18px 24px",
    background: "#B4F05A",
    color: "#000",
    borderRadius: "16px",
    fontWeight: "bold",
  },
  btnGroup: { display: "flex", gap: "20px", justifyContent: "center" },
  restartBtn: {
    background: "#FF008A",
    color: "#fff",
    padding: "18px 36px",
    border: "none",
    borderRadius: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "16px",
  },
  exitBtn: {
    background: "#222",
    color: "#fff",
    padding: "18px 36px",
    border: "none",
    borderRadius: "16px",
    cursor: "pointer",
    fontSize: "16px",
  },
};

export default FridgeGamePage;
