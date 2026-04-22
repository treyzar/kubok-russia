package com.onlineshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "room_places")
@IdClass(RoomPlace.PK.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class RoomPlace {

    @Id
    @Column(name = "room_id")
    private Integer roomId;

    @Id
    @Column(name = "place_index")
    private Integer placeIndex;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PK implements Serializable {
        private Integer roomId;
        private Integer placeIndex;
    }
}
