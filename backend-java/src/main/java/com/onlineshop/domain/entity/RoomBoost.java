package com.onlineshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "room_boosts")
@IdClass(RoomBoost.PK.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class RoomBoost {

    @Id @Column(name = "room_id") private Integer roomId;
    @Id @Column(name = "user_id") private Integer userId;

    @Column(nullable = false)
    private Integer amount;

    @Column(name = "boosted_at", nullable = false, updatable = false)
    private Instant boostedAt;

    @PrePersist
    void prePersist() { if (boostedAt == null) boostedAt = Instant.now(); }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class PK implements Serializable {
        private Integer roomId;
        private Integer userId;
    }
}
