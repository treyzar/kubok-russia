package com.onlineshop.service;

import com.onlineshop.domain.entity.User;
import com.onlineshop.exception.DomainExceptions.InsufficientBalanceException;
import com.onlineshop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepo;

    @Transactional
    public User create(String name, BigDecimal initialBalance) {
        User u = User.builder().name(name).balance(initialBalance == null ? BigDecimal.ZERO : initialBalance).build();
        return userRepo.save(u);
    }

    @Transactional(readOnly = true)
    public User get(Integer id) {
        return userRepo.findById(id).orElseThrow(() -> new NoSuchElementException("user not found"));
    }

    @Transactional
    public void debit(Integer userId, BigDecimal amount) {
        User u = userRepo.findByIdForUpdate(userId)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        if (u.getBalance().compareTo(amount) < 0) throw new InsufficientBalanceException();
        u.setBalance(u.getBalance().subtract(amount));
        userRepo.save(u);
    }

    @Transactional
    public void credit(Integer userId, BigDecimal amount) {
        User u = userRepo.findByIdForUpdate(userId)
                .orElseThrow(() -> new NoSuchElementException("user not found"));
        u.setBalance(u.getBalance().add(amount));
        userRepo.save(u);
    }
}
