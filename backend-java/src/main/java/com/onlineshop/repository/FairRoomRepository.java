package com.onlineshop.repository;

import com.onlineshop.domain.entity.FairRoom;
import com.onlineshop.domain.enums.FairRoomState;
import com.onlineshop.domain.enums.RiskLevel;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FairRoomRepository extends JpaRepository<FairRoom, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM FairRoom r WHERE r.id = :id")
    Optional<FairRoom> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
           SELECT r FROM FairRoom r
           WHERE r.riskLevel IN :levels
             AND r.state IN (com.onlineshop.domain.enums.FairRoomState.CREATED,
                             com.onlineshop.domain.enums.FairRoomState.WAITING)
           """)
    List<FairRoom> findAvailableForLevels(@Param("levels") List<RiskLevel> levels);

    @Query("""
           SELECT r FROM FairRoom r
           WHERE r.riskLevel = :level
             AND r.state IN (com.onlineshop.domain.enums.FairRoomState.CREATED,
                             com.onlineshop.domain.enums.FairRoomState.WAITING)
           """)
    List<FairRoom> findActiveByRisk(@Param("level") RiskLevel level);

    @Modifying
    @Query("UPDATE FairRoom r SET r.state = :state, r.updatedAt = :now WHERE r.id = :id")
    int updateState(@Param("id") UUID id,
                    @Param("state") FairRoomState state,
                    @Param("now") Instant now);

    @Modifying
    @Query("UPDATE FairRoom r SET r.finalFee = :finalFee, " +
           "r.state = com.onlineshop.domain.enums.FairRoomState.REFUNDING, " +
           "r.updatedAt = :now WHERE r.id = :id")
    int updateFinalFeeToRefunding(@Param("id") UUID id,
                                  @Param("finalFee") BigDecimal finalFee,
                                  @Param("now") Instant now);
}
