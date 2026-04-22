package com.onlineshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "room_players")
@IdClass(RoomPlayer.PK.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class RoomPlayer {

    @Id
    @Column(name = "room_id")
    private Integer roomId;

    @Id
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PK implements Serializable {
        private Integer roomId;
        private Integer userId;
    }
}
