package com.onlineshop.domain.enums;

public enum GameType {
    JACKPOT("jackpot"),
    BOOST("boost"),
    FAIR("fair");

    private final String value;
    GameType(String value) { this.value = value; }
    public String getValue() { return value; }

    public static GameType fromValue(String v) {
        for (GameType s : values()) if (s.value.equals(v)) return s;
        throw new IllegalArgumentException("unknown GameType: " + v);
    }
}
