package com.onlineshop.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "fair_players",
       uniqueConstraints = @UniqueConstraint(columnNames = {"room_id", "user_id"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class FairPlayer {
    @Id
    private UUID id;

    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "initial_deposit", nullable = false, precision = 18, scale = 8)
    private BigDecimal initialDeposit;

    @Column(name = "refund_amount", nullable = false, precision = 18, scale = 8)
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private Boolean refunded = false;
}
