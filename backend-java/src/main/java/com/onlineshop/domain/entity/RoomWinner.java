package com.onlineshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "room_winners")
@IdClass(RoomWinner.PK.class)
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class RoomWinner {

    @Id
    @Column(name = "room_id")
    private Integer roomId;

    @Id
    @Column(name = "user_id")
    private Integer userId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal prize;

    @Column(name = "won_at", nullable = false, updatable = false)
    private Instant wonAt = Instant.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PK implements Serializable {
        private Integer roomId;
        private Integer userId;
    }
}
