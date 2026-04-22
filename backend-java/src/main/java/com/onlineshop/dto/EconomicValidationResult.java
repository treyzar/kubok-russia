package com.onlineshop.dto;

import java.util.List;

public record EconomicValidationResult(
        int prizeFund,
        int organiserCut,
        double playerROI,
        double playerWinProb,
        List<String> warnings,
        boolean isViable
) {}
