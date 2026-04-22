package com.onlineshop.domain.enums;

import java.util.List;
import java.util.Map;

public enum RiskLevel {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high");

    private final String value;
    RiskLevel(String value) { this.value = value; }
    public String getValue() { return value; }

    public static RiskLevel fromValue(String v) {
        for (RiskLevel s : values()) if (s.value.equalsIgnoreCase(v)) return s;
        throw new IllegalArgumentException("unknown RiskLevel: " + v);
    }

    /**
     * Up-sell visibility: a player at level X sees rooms at X and above.
     * Mirrors Go's domain.RiskLevelOrder.
     */
    public static final Map<RiskLevel, List<RiskLevel>> ORDER = Map.of(
            LOW, List.of(LOW, MEDIUM, HIGH),
            MEDIUM, List.of(MEDIUM, HIGH),
            HIGH, List.of(HIGH)
    );
}
