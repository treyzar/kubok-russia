package validator

// EconomicValidator validates room configuration for economic viability.
type EconomicValidator struct{}

// ValidationResult holds the calculated metrics and any warnings for a room config.
type ValidationResult struct {
	PrizeFund     int32
	OrganiserCut  int32
	PlayerROI     float64
	PlayerWinProb float64
	Warnings      []string
	IsViable      bool
}

// ValidateRoomConfig calculates economic metrics and generates warnings.
// Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
func (v *EconomicValidator) ValidateRoomConfig(playersNeeded, entryCost, winnerPct int32) *ValidationResult {
	fullJackpot := playersNeeded * entryCost
	prizeFund := fullJackpot * winnerPct / 100
	organiserCut := fullJackpot - prizeFund

	var playerROI float64
	if entryCost > 0 {
		playerROI = float64(prizeFund) / float64(entryCost)
	}

	// Player win probability = 1 / players_needed (Requirement 3.1)
	var playerWinProb float64
	if playersNeeded > 0 {
		playerWinProb = 1.0 / float64(playersNeeded)
	}

	var warnings []string

	// ROI warning: player ROI < 1.5 means prize fund < 1.5x entry cost (Requirement 3.3)
	if playerROI < 1.5 {
		warnings = append(warnings, "prize fund may be unattractive to players")
	}

	// Margin warning: organiser margin < 10% of full jackpot (Requirement 3.4)
	if fullJackpot > 0 && float64(organiserCut) < float64(fullJackpot)*0.10 {
		warnings = append(warnings, "organiser margin is very low")
	}

	// Extreme winner_pct warnings
	if winnerPct > 95 {
		warnings = append(warnings, "winner_pct leaves no organiser margin")
	}
	if winnerPct < 50 {
		warnings = append(warnings, "winner receives less than half the jackpot")
	}

	// Low win probability warning: < 5% (Requirement 3.5)
	if playerWinProb < 0.05 {
		warnings = append(warnings, "very low win probability may discourage players")
	}

	return &ValidationResult{
		PrizeFund:     prizeFund,
		OrganiserCut:  organiserCut,
		PlayerROI:     playerROI,
		PlayerWinProb: playerWinProb,
		Warnings:      warnings,
		IsViable:      len(warnings) == 0,
	}
}
