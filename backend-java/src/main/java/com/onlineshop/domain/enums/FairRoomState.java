package com.onlineshop.domain.enums;

public enum FairRoomState {
    CREATED("created"),
    WAITING("waiting"),
    REFUNDING("refunding"),
    FINISHED("finished");

    private final String value;
    FairRoomState(String value) { this.value = value; }
    public String getValue() { return value; }

    public static FairRoomState fromValue(String v) {
        for (FairRoomState s : values()) if (s.value.equals(v)) return s;
        throw new IllegalArgumentException("unknown FairRoomState: " + v);
    }
}
