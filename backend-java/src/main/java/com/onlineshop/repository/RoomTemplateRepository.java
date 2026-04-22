package com.onlineshop.repository;

import com.onlineshop.domain.entity.RoomTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RoomTemplateRepository extends JpaRepository<RoomTemplate, Integer> {
    Optional<RoomTemplate> findByName(String name);

    @Query("""
           SELECT COUNT(t) > 0 FROM RoomTemplate t
           WHERE t.playersNeeded = :playersNeeded
             AND t.minPlayers = :minPlayers
             AND t.entryCost = :entryCost
             AND t.winnerPct = :winnerPct
             AND t.gameType = com.onlineshop.domain.enums.GameType.JACKPOT
           """)
    boolean existsDuplicate(@Param("playersNeeded") Integer playersNeeded,
                            @Param("minPlayers") Integer minPlayers,
                            @Param("entryCost") Integer entryCost,
                            @Param("winnerPct") Integer winnerPct);
}
