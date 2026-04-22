package com.onlineshop.repository;

import com.onlineshop.domain.entity.RoomPlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomPlaceRepository extends JpaRepository<RoomPlace, RoomPlace.PK> {

    List<RoomPlace> findAllByRoomId(Integer roomId);
    long countByRoomId(Integer roomId);
    long countByRoomIdAndUserId(Integer roomId, Integer userId);

    @Query("SELECT COALESCE(MAX(p.placeIndex), 0) FROM RoomPlace p WHERE p.roomId = :roomId")
    Optional<Integer> findMaxIndexByRoomId(@Param("roomId") Integer roomId);
}
