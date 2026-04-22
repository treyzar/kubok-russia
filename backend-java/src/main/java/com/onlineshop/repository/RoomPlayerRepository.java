package com.onlineshop.repository;

import com.onlineshop.domain.entity.RoomPlayer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomPlayerRepository extends JpaRepository<RoomPlayer, RoomPlayer.PK> {
    List<RoomPlayer> findAllByRoomId(Integer roomId);
    long countByRoomId(Integer roomId);
    boolean existsByRoomIdAndUserId(Integer roomId, Integer userId);
    void deleteByRoomIdAndUserId(Integer roomId, Integer userId);
}
