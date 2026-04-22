package com.onlineshop.dto;

import com.onlineshop.domain.enums.GameType;
import jakarta.validation.constraints.*;

public record TemplateDto(
        @NotBlank @Size(max = 255) String name,
        @NotNull @Min(1) Integer playersNeeded,
        @NotNull @Min(1) Integer minPlayers,
        @NotNull @Min(1) Integer entryCost,
        @NotNull @Min(1) @Max(100) Integer winnerPct,
        @NotNull @Min(1) Integer roundDurationSeconds,
        @NotNull @Min(0) Integer startDelaySeconds,
        @NotNull GameType gameType
) {}
