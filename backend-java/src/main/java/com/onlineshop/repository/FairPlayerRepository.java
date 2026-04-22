package com.onlineshop.repository;

import com.onlineshop.domain.entity.FairPlayer;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FairPlayerRepository extends JpaRepository<FairPlayer, UUID> {

    long countByRoomId(UUID roomId);

    boolean existsByRoomIdAndUserId(UUID roomId, UUID userId);

    List<FairPlayer> findAllByRoomId(UUID roomId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT MIN(p.initialDeposit) FROM FairPlayer p WHERE p.roomId = :roomId")
    Optional<BigDecimal> findMinDepositForUpdate(@Param("roomId") UUID roomId);

    @Modifying
    @Query("UPDATE FairPlayer p SET p.refundAmount = :amount, p.refunded = TRUE WHERE p.id = :id")
    int updateRefund(@Param("id") UUID id, @Param("amount") BigDecimal amount);
}
