package com.onlineshop.domain.entity;

import com.onlineshop.domain.enums.GameType;
import com.onlineshop.domain.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "rooms")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Integer roomId;

    @Column(nullable = false)
    private Integer jackpot = 0;

    @Column(name = "start_time")
    private Instant startTime;

    @Column(nullable = false, length = 32)
    @Convert(converter = RoomStatus.JpaConverter.class)
    private RoomStatus status = RoomStatus.NEW;

    @Column(name = "players_needed", nullable = false)
    private Integer playersNeeded;

    @Column(name = "min_players", nullable = false)
    private Integer minPlayers = 1;

    @Column(name = "entry_cost", nullable = false)
    private Integer entryCost = 100;

    @Column(name = "winner_pct", nullable = false)
    private Integer winnerPct = 80;

    @Column(name = "round_duration_seconds", nullable = false)
    private Integer roundDurationSeconds = 30;

    @Column(name = "start_delay_seconds", nullable = false)
    private Integer startDelaySeconds = 60;

    @Column(name = "game_type", nullable = false, length = 20)
    @Convert(converter = GameTypeConverter.class)
    private GameType gameType = GameType.TRAIN;

    @Column(name = "template_id")
    private Integer templateId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void touch() { this.updatedAt = Instant.now(); }

    @Converter(autoApply = false)
    public static class GameTypeConverter implements AttributeConverter<GameType, String> {
        @Override public String convertToDatabaseColumn(GameType g) { return g == null ? null : g.getValue(); }
        @Override public GameType convertToEntityAttribute(String s) { return s == null ? null : GameType.fromValue(s); }
    }
}
