package com.onlineshop.service;

import com.onlineshop.domain.entity.User;
import com.onlineshop.domain.enums.UserRole;
import com.onlineshop.exception.DomainExceptions.InsufficientBalanceException;
import com.onlineshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

/**
 * Mirrors backend/handlers/user_handler.go user-side logic. Money is stored
 * as INTEGER in game currency (no decimals).
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepo;

    @Transactional
    public User create(String name, int initialBalance, boolean bot) {
        return create(name, initialBalance, bot, UserRole.USER);
    }

    @Transactional
    public User create(String name, int initialBalance, boolean bot, UserRole role) {
        User u = User.builder()
                .name(name)
                .balance(initialBalance)
                .bot(bot)
                .role(role != null ? role : UserRole.USER)
                .build();
        return userRepo.save(u);
    }

    @Transactional(readOnly = true)
    public User get(Integer id) {
        return userRepo.findById(id).orElseThrow(() -> new NoSuchElementException("user not found"));
    }

    @Transactional(readOnly = true)
    public List<User> list() { return userRepo.findAll(); }

    @Transactional
    public void delete(Integer id) {
        if (!userRepo.existsById(id)) throw new NoSuchElementException("user not found");
        userRepo.deleteById(id);
    }

    /** Subtract amount; throws InsufficientBalance if not enough funds. */
    @Transactional
    public void debit(Integer userId, int amount) {
        User u = userRepo.findByIdForUpdate(userId)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        if (u.getBalance() < amount) throw new InsufficientBalanceException();
        u.setBalance(u.getBalance() - amount);
        userRepo.save(u);
    }

    @Transactional
    public void credit(Integer userId, int amount) {
        User u = userRepo.findByIdForUpdate(userId)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        u.setBalance(u.getBalance() + amount);
        userRepo.save(u);
    }

    /** Set balance to an absolute value. */
    @Transactional
    public User setBalance(Integer userId, int balance) {
        User u = userRepo.findByIdForUpdate(userId)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        u.setBalance(balance);
        return userRepo.save(u);
    }

    /** Apply a delta (positive or negative) to balance. */
    @Transactional
    public User patchBalance(Integer userId, int delta) {
        User u = userRepo.findByIdForUpdate(userId)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        int nb = u.getBalance() + delta;
        if (nb < 0) throw new InsufficientBalanceException();
        u.setBalance(nb);
        return userRepo.save(u);
    }
}
