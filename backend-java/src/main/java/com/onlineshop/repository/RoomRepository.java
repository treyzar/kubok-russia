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

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Room r WHERE r.templateId = :tid AND r.status IN :statuses")
    int deleteByTemplateIdAndStatusIn(@Param("tid") Integer templateId,
                                      @Param("statuses") java.util.Collection<RoomStatus> statuses);

    @Query("""
           SELECT new com.onlineshop.repository.RoomRepository$StatusCounts(
              SUM(CASE WHEN r.status = com.onlineshop.domain.enums.RoomStatus.PLAYING THEN 1 ELSE 0 END),
              SUM(CASE WHEN r.status IN (com.onlineshop.domain.enums.RoomStatus.NEW,
                                          com.onlineshop.domain.enums.RoomStatus.STARTING_SOON) THEN 1 ELSE 0 END))
           FROM Room r WHERE r.templateId = :tid
           """)
    StatusCounts countActiveAndWaiting(@Param("tid") Integer templateId);

    class StatusCounts {
        public final long active;
        public final long waiting;
        public StatusCounts(Long active, Long waiting) {
            this.active = active == null ? 0L : active;
            this.waiting = waiting == null ? 0L : waiting;
        }
    }
}
