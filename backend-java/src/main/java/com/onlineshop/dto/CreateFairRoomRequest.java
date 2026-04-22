package com.onlineshop.dto;

import com.onlineshop.domain.enums.RiskLevel;
import jakarta.validation.constraints.NotNull;

public record CreateFairRoomRequest(@NotNull RiskLevel riskLevel) {}
