package com.onlineshop.repository;

import com.onlineshop.domain.entity.RoomWinner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoomWinnerRepository extends JpaRepository<RoomWinner, RoomWinner.PK> {
    List<RoomWinner> findAllByRoomId(Integer roomId);
}
