package com.onlineshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;

/**
 * room_players row. Composite PK (room_id, user_id, place_id) per migration 015.
 * place_id is a FK to room_places(room_id, place_index) — the user's "first" place.
 */
@Entity
@Table(name = "room_players")
@IdClass(RoomPlayer.PK.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class RoomPlayer {

    @Id @Column(name = "room_id")  private Integer roomId;
    @Id @Column(name = "user_id")  private Integer userId;
    @Id @Column(name = "place_id") private Integer placeId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt = Instant.now();

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class PK implements Serializable {
        private Integer roomId;
        private Integer userId;
        private Integer placeId;
    }
}
