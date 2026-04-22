package com.onlineshop.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

public enum RoomStatus {
    NEW("new"),
    STARTING_SOON("starting_soon"),
    PLAYING("playing"),
    FINISHED("finished");

    private final String value;
    RoomStatus(String value) { this.value = value; }

    @JsonValue
    public String getValue() { return value; }

    @JsonCreator
    public static RoomStatus fromValue(String v) {
        for (RoomStatus s : values()) if (s.value.equalsIgnoreCase(v)) return s;
        throw new IllegalArgumentException("unknown RoomStatus: " + v);
    }

    /** JPA converter so DB stores lowercase values matching the Go schema. */
    @Converter(autoApply = false)
    public static class JpaConverter implements AttributeConverter<RoomStatus, String> {
        @Override public String convertToDatabaseColumn(RoomStatus s) { return s == null ? null : s.value; }
        @Override public RoomStatus convertToEntityAttribute(String s) { return s == null ? null : fromValue(s); }
    }
}
