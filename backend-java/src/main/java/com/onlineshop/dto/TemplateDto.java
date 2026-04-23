package com.onlineshop.dto;

import com.onlineshop.domain.enums.GameType;
import jakarta.validation.constraints.*;

public record TemplateDto(
        @Size(max = 255) String name,
        Integer playersNeeded,
        @Min(1) Integer minPlayers,
        @Min(1) Integer maxPlayers,
        @NotNull @Min(0) Integer entryCost,
        @NotNull @Min(1) @Max(99) Integer winnerPct,
        Integer roundDurationSeconds,
        Integer startDelaySeconds,
        GameType gameType
) {
    public Integer effectivePlayersNeeded() {
        if (playersNeeded != null) return playersNeeded;
        if (maxPlayers != null) return maxPlayers;
        return 1;
    }
    public Integer effectiveRoundDurationSeconds() {
        return roundDurationSeconds != null ? roundDurationSeconds : 30;
    }
    public Integer effectiveStartDelaySeconds() {
        return startDelaySeconds != null ? startDelaySeconds : 60;
    }
    public GameType effectiveGameType() {
        return gameType != null ? gameType : GameType.FRIDGE;
    }
    public String effectiveName() {
        int players = effectivePlayersNeeded();
        return name != null && !name.isBlank()
                ? name
                : "Template " + players + "p/" + entryCost + "c/" + winnerPct + "%";
    }
}
