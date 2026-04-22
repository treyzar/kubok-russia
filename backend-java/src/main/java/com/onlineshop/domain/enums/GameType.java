package com.onlineshop.domain.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Game type — must match Go's allowed values 'train' and 'fridge' (mig 012/013
 * CHECK constraint check_game_type / check_rooms_game_type).
 */
public enum GameType {
    TRAIN("train"),
    FRIDGE("fridge");

    private final String value;
    GameType(String value) { this.value = value; }

    @JsonValue
    public String getValue() { return value; }

    @JsonCreator
    public static GameType fromValue(String v) {
        if (v == null) throw new IllegalArgumentException("game_type is null");
        for (GameType g : values()) if (g.value.equalsIgnoreCase(v)) return g;
        throw new IllegalArgumentException("unknown GameType: " + v);
    }
}
