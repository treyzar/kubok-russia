package com.onlineshop.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.onlineshop.domain.enums.FairRoomState;
import com.onlineshop.domain.enums.RiskLevel;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fair_rooms")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class FairRoom {

    @Id
    private UUID id;

    @Column(name = "risk_level", nullable = false, length = 20)
    @Convert(converter = RiskLevel.JpaConverter.class)
    private RiskLevel riskLevel;

    @Column(nullable = false, length = 20)
    @Convert(converter = FairRoomState.JpaConverter.class)
    private FairRoomState state = FairRoomState.CREATED;

    @Column(name = "max_capacity", nullable = false)
    private Integer maxCapacity = 10;

    @JsonIgnore
    @Column(name = "seed_phrase", nullable = false, columnDefinition = "TEXT")
    private String seedPhrase;

    @Column(name = "seed_hash", nullable = false, columnDefinition = "TEXT")
    private String seedHash;

    @Column(name = "final_fee", nullable = false, precision = 18, scale = 8)
    private BigDecimal finalFee = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Transient
    private long playerCount;

    @PreUpdate public void touch() { this.updatedAt = Instant.now(); }
}
