package com.onlineshop.repository;

import com.onlineshop.domain.entity.RoomTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomTemplateRepository extends JpaRepository<RoomTemplate, Integer> {
    Optional<RoomTemplate> findByName(String name);

    /** Templates that have not been soft-deleted. */
    @Query("SELECT t FROM RoomTemplate t WHERE t.deletedAt IS NULL ORDER BY t.templateId")
    List<RoomTemplate> findActive();

    @Query("""
           SELECT COUNT(t) > 0 FROM RoomTemplate t
           WHERE t.deletedAt IS NULL
             AND t.maxPlayers = :maxPlayers
             AND t.minPlayers = :minPlayers
             AND t.entryCost = :entryCost
             AND t.winnerPct = :winnerPct
             AND t.gameType = :gameType
           """)
    boolean existsDuplicate(@Param("maxPlayers") Integer maxPlayers,
                            @Param("minPlayers") Integer minPlayers,
                            @Param("entryCost") Integer entryCost,
                            @Param("winnerPct") Integer winnerPct,
                            @Param("gameType") com.onlineshop.domain.enums.GameType gameType);
}
