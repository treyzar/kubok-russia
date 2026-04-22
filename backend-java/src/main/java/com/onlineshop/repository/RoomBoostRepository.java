package com.onlineshop.repository;

import com.onlineshop.domain.entity.RoomBoost;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomBoostRepository extends JpaRepository<RoomBoost, RoomBoost.PK> {
    List<RoomBoost> findAllByRoomId(Integer roomId);
}
