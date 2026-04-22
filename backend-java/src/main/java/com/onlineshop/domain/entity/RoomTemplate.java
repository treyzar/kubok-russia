package com.onlineshop.domain.entity;

import com.onlineshop.domain.enums.GameType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "room_templates")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class RoomTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "template_id")
    private Integer templateId;

    @Column(nullable = false, unique = true, length = 255)
    private String name;

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
    @Convert(converter = Room.GameTypeConverter.class)
    private GameType gameType = GameType.TRAIN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist public void prePersistTimestamps() { Instant n=Instant.now(); if(createdAt==null) createdAt=n; if(updatedAt==null) updatedAt=n; }
    @PreUpdate public void touch() { this.updatedAt = Instant.now(); }
}
