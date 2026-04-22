package com.onlineshop.repository;

import com.onlineshop.domain.entity.RoomPlayer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RoomPlayerRepository extends JpaRepository<RoomPlayer, RoomPlayer.PK> {
    List<RoomPlayer> findAllByRoomId(Integer roomId);
    long countByRoomId(Integer roomId);
    boolean existsByRoomIdAndUserId(Integer roomId, Integer userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM RoomPlayer p WHERE p.roomId = :roomId AND p.userId = :userId")
    int deleteByRoomIdAndUserId(@Param("roomId") Integer roomId, @Param("userId") Integer userId);
}
