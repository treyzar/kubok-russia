package com.onlineshop.repository;

import com.onlineshop.domain.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Integer id);

    /** Bots whose balance is at least entryCost — used by RoomStarter to fill rooms. */
    @Query("SELECT u FROM User u WHERE u.bot = TRUE AND u.balance >= :minBalance ORDER BY u.id")
    List<User> findAvailableBots(@Param("minBalance") int minBalance);

    long countByBotTrue();

    @Query("SELECT u FROM User u WHERE u.bot = TRUE AND u.balance < :threshold")
    List<User> findBotsBelowBalance(@Param("threshold") int threshold);
}
