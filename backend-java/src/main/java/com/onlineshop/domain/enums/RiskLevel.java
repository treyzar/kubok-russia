package com.onlineshop.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.List;
import java.util.Map;

public enum RiskLevel {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high");

    private final String value;
    RiskLevel(String value) { this.value = value; }

    @JsonValue
    public String getValue() { return value; }

    @JsonCreator
    public static RiskLevel fromValue(String v) {
        for (RiskLevel s : values()) if (s.value.equalsIgnoreCase(v)) return s;
        throw new IllegalArgumentException("unknown RiskLevel: " + v);
    }

    /** Mirrors Go domain.RiskLevelOrder up-sell visibility map. */
    public static final Map<RiskLevel, List<RiskLevel>> ORDER = Map.of(
            LOW, List.of(LOW, MEDIUM, HIGH),
            MEDIUM, List.of(MEDIUM, HIGH),
            HIGH, List.of(HIGH)
    );

    @Converter(autoApply = false)
    public static class JpaConverter implements AttributeConverter<RiskLevel, String> {
        @Override public String convertToDatabaseColumn(RiskLevel s) { return s == null ? null : s.value; }
        @Override public RiskLevel convertToEntityAttribute(String s) { return s == null ? null : fromValue(s); }
    }
}
