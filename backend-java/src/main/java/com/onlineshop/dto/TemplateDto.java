package com.onlineshop.dto;

import com.onlineshop.domain.enums.GameType;
import jakarta.validation.constraints.*;

public record TemplateDto(
        @Size(max = 255) String name,
        Integer playersNeeded,
        @NotNull @Min(1) Integer minPlayers,
        @NotNull @Min(1) Integer maxPlayers,
        @NotNull @Min(0) Integer entryCost,
        @NotNull @Min(1) @Max(99) Integer winnerPct,
        Integer roundDurationSeconds,
        Integer startDelaySeconds,
        GameType gameType
) {
    public Integer effectivePlayersNeeded() {
        return playersNeeded != null ? playersNeeded : maxPlayers;
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
        return name != null && !name.isBlank()
                ? name
                : "Template " + maxPlayers + "p/" + entryCost + "c/" + winnerPct + "%";
    }
}

