package com.onlineshop.dto;

import com.onlineshop.domain.enums.GameType;
import jakarta.validation.constraints.*;

public record TemplateDto(
        @NotBlank @Size(max = 255) String name,
        @NotNull @Min(1) Integer playersNeeded,
        @NotNull @Min(1) Integer minPlayers,
        @NotNull @Min(0) Integer entryCost,
        @NotNull @Min(1) @Max(99) Integer winnerPct,
        @NotNull @Min(10) @Max(3600) Integer roundDurationSeconds,
        @NotNull @Min(5) @Max(600) Integer startDelaySeconds,
        @NotNull GameType gameType
) {}
