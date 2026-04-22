package com.onlineshop.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.onlineshop.domain.entity.FairRoom;
import com.onlineshop.domain.enums.FairRoomState;
import com.onlineshop.domain.enums.RiskLevel;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FairRoomDto(
        UUID id,
        RiskLevel riskLevel,
        FairRoomState state,
        Integer maxCapacity,
        String seedHash,
        BigDecimal finalFee,
        long playerCount,
        Instant createdAt,
        Instant updatedAt,
        String seedReveal
) {
    public static FairRoomDto from(FairRoom r) {
        String reveal = r.getState() == FairRoomState.FINISHED ? r.getSeedPhrase() : null;
        return new FairRoomDto(
                r.getId(),
                r.getRiskLevel(),
                r.getState(),
                r.getMaxCapacity(),
                r.getSeedHash(),
                r.getFinalFee(),
                r.getPlayerCount(),
                r.getCreatedAt(),
                r.getUpdatedAt(),
                reveal
        );
    }
}
