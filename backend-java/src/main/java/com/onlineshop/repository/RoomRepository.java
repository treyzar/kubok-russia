package com.onlineshop.repository;

import com.onlineshop.domain.entity.Room;
import com.onlineshop.domain.enums.RoomStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Integer> {

    List<Room> findAllByStatus(RoomStatus status);

    @Query("SELECT r FROM Room r WHERE r.status = :status AND r.startTime <= :now")
    List<Room> findReadyToStart(@Param("status") RoomStatus status, @Param("now") Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.roomId = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Integer id);
}
