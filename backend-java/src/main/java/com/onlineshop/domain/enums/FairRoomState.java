package com.onlineshop.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum FairRoomState {
    CREATED("created"),
    WAITING("waiting"),
    REFUNDING("refunding"),
    FINISHED("finished");

    private final String value;
    FairRoomState(String value) { this.value = value; }

    @JsonValue
    public String getValue() { return value; }

    @JsonCreator
    public static FairRoomState fromValue(String v) {
        for (FairRoomState s : values()) if (s.value.equalsIgnoreCase(v)) return s;
        throw new IllegalArgumentException("unknown FairRoomState: " + v);
    }

    @Converter(autoApply = false)
    public static class JpaConverter implements AttributeConverter<FairRoomState, String> {
        @Override public String convertToDatabaseColumn(FairRoomState s) { return s == null ? null : s.value; }
        @Override public FairRoomState convertToEntityAttribute(String s) { return s == null ? null : fromValue(s); }
    }
}
