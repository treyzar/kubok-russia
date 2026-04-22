package com.onlineshop.domain.enums;

public enum RoomStatus {
    NEW("new"),
    STARTING_SOON("starting_soon"),
    PLAYING("playing"),
    FINISHED("finished");

    private final String value;

    RoomStatus(String value) { this.value = value; }

    public String getValue() { return value; }

    public static RoomStatus fromValue(String v) {
        for (RoomStatus s : values()) if (s.value.equals(v)) return s;
        throw new IllegalArgumentException("unknown RoomStatus: " + v);
    }
}
