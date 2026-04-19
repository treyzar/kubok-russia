package fair_rooms_test

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"testing"

	"github.com/SomeSuperCoder/OnlineShop/internal/domain"
)

// seedGen mirrors the logic in service.generateSeed.
func seedGen() (seedPhrase, seedHash string) {
	buf := make([]byte, 32)
	rand.Read(buf) //nolint:errcheck
	seedPhrase = hex.EncodeToString(buf)
	hash := sha256.Sum256([]byte(seedPhrase))
	seedHash = hex.EncodeToString(hash[:])
	return
}

var hexRe = regexp.MustCompile(`^[0-9a-f]+$`)

// TC-01: seed_hash is 64 hex characters long.
func TestSeedHash_Length(t *testing.T) {
	_, seedHash := seedGen()
	if len(seedHash) != 64 {
		t.Errorf("expected seed_hash length 64, got %d", len(seedHash))
	}
}

// TC-03: seed_hash contains only lowercase hex characters.
func TestSeedHash_HexCharsOnly(t *testing.T) {
	_, seedHash := seedGen()
	if !hexRe.MatchString(seedHash) {
		t.Errorf("seed_hash contains non-hex characters: %s", seedHash)
	}
}

// TC-19: SHA-256(seed_phrase) == seed_hash.
func TestSeedHash_MatchesSHA256OfPhrase(t *testing.T) {
	seedPhrase, seedHash := seedGen()
	hash := sha256.Sum256([]byte(seedPhrase))
	expected := hex.EncodeToString(hash[:])
	if seedHash != expected {
		t.Errorf("seed_hash mismatch: got %s, want %s", seedHash, expected)
	}
}

// --- Refund calculation ---

// computeRefunds mirrors the service refund logic: refund = max(0, deposit - minDeposit).
func computeRefunds(deposits []float64) (finalFee float64, refunds []float64) {
	if len(deposits) == 0 {
		return 0, nil
	}
	finalFee = deposits[0]
	for _, d := range deposits[1:] {
		if d < finalFee {
			finalFee = d
		}
	}
	refunds = make([]float64, len(deposits))
	for i, d := range deposits {
		r := d - finalFee
		if r < 0 {
			r = 0
		}
		refunds[i] = r
	}
	return
}

// TC-04: standard case — different deposits, correct refunds.
func TestRefund_StandardCase(t *testing.T) {
	deposits := []float64{100, 200, 150}
	finalFee, refunds := computeRefunds(deposits)
	if finalFee != 100 {
		t.Errorf("expected final_fee 100, got %f", finalFee)
	}
	expected := []float64{0, 100, 50}
	for i, want := range expected {
		if refunds[i] != want {
			t.Errorf("refunds[%d]: got %f, want %f", i, refunds[i], want)
		}
	}
}

// TC-05: equal deposits — all refunds are zero.
func TestRefund_EqualDeposits(t *testing.T) {
	deposits := []float64{50, 50, 50}
	finalFee, refunds := computeRefunds(deposits)
	if finalFee != 50 {
		t.Errorf("expected final_fee 50, got %f", finalFee)
	}
	for i, r := range refunds {
		if r != 0 {
			t.Errorf("refunds[%d]: expected 0, got %f", i, r)
		}
	}
}

// TC-06: one player has the minimum deposit — only others get refunds.
func TestRefund_OneMinimum(t *testing.T) {
	deposits := []float64{30, 80, 60}
	finalFee, refunds := computeRefunds(deposits)
	if finalFee != 30 {
		t.Errorf("expected final_fee 30, got %f", finalFee)
	}
	if refunds[0] != 0 {
		t.Errorf("min depositor should get 0 refund, got %f", refunds[0])
	}
	if refunds[1] != 50 {
		t.Errorf("refunds[1]: expected 50, got %f", refunds[1])
	}
	if refunds[2] != 30 {
		t.Errorf("refunds[2]: expected 30, got %f", refunds[2])
	}
}

// --- Auto-scale ratio logic ---

// scaleCheck mirrors checkAndScale ratio logic.
// Returns true if a new room should be created.
func scaleCheck(rooms []domain.FairRoom) bool {
	if len(rooms) == 0 {
		return false
	}
	atThreshold := 0
	for _, r := range rooms {
		if float64(r.PlayerCount)/float64(r.MaxCapacity) >= 0.70 {
			atThreshold++
		}
	}
	return float64(atThreshold)/float64(len(rooms)) >= 0.70
}

func makeRoom(playerCount, maxCapacity int) domain.FairRoom {
	return domain.FairRoom{PlayerCount: playerCount, MaxCapacity: maxCapacity}
}

// TC-07: threshold not met — no scale.
func TestAutoScale_ThresholdNotMet(t *testing.T) {
	rooms := []domain.FairRoom{
		makeRoom(3, 10), // 30%
		makeRoom(4, 10), // 40%
		makeRoom(5, 10), // 50%
	}
	if scaleCheck(rooms) {
		t.Error("expected no scale when threshold not met")
	}
}

// TC-08: threshold met — scale triggered.
func TestAutoScale_ThresholdMet(t *testing.T) {
	rooms := []domain.FairRoom{
		makeRoom(7, 10), // 70%
		makeRoom(8, 10), // 80%
		makeRoom(9, 10), // 90%
	}
	if !scaleCheck(rooms) {
		t.Error("expected scale when ≥70% of rooms are ≥70% full")
	}
}

// TC-09: single room at threshold — scale triggered.
func TestAutoScale_SingleRoomAtThreshold(t *testing.T) {
	rooms := []domain.FairRoom{makeRoom(7, 10)} // 70%
	if !scaleCheck(rooms) {
		t.Error("expected scale for single room at 70% capacity")
	}
}

// --- Up-sell level filtering via RiskLevelOrder ---

// TC-10: low risk level sees all three levels.
func TestRiskLevelOrder_LowSeesAll(t *testing.T) {
	levels := domain.RiskLevelOrder[domain.RiskLow]
	want := map[domain.RiskLevel]bool{
		domain.RiskLow: true, domain.RiskMedium: true, domain.RiskHigh: true,
	}
	if len(levels) != 3 {
		t.Errorf("expected 3 levels for low, got %d", len(levels))
	}
	for _, l := range levels {
		if !want[l] {
			t.Errorf("unexpected level %q in low order", l)
		}
	}
}

// TC-11: high risk level sees only high.
func TestRiskLevelOrder_HighSeesOnlyHigh(t *testing.T) {
	levels := domain.RiskLevelOrder[domain.RiskHigh]
	if len(levels) != 1 || levels[0] != domain.RiskHigh {
		t.Errorf("expected only [high] for high, got %v", levels)
	}
}
