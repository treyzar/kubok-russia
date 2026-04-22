package com.onlineshop.exception;

import com.onlineshop.exception.DomainExceptions.*;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<Map<String, Object>> body(HttpStatus status, String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("timestamp", Instant.now().toString());
        m.put("status", status.value());
        m.put("error", status.getReasonPhrase());
        m.put("message", msg);
        return ResponseEntity.status(status).body(m);
    }

    @ExceptionHandler({RoomNotFoundException.class, NoSuchElementException.class})
    public ResponseEntity<?> handleNotFound(RuntimeException e) {
        return body(HttpStatus.NOT_FOUND, e.getMessage());
    }

    /** Insufficient balance maps to 402 (Payment Required) — matches Go. */
    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<?> handlePaymentRequired(InsufficientBalanceException e) {
        return body(HttpStatus.PAYMENT_REQUIRED, e.getMessage());
    }

    /** Structured 402 with required/current_balance/shortfall — matches Go. */
    @ExceptionHandler(InsufficientBalanceForRoomException.class)
    public ResponseEntity<?> handleStructuredPaymentRequired(InsufficientBalanceForRoomException e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("message", e.getMessage());
        m.put("required", e.getRequired());
        m.put("current_balance", e.getCurrentBalance());
        m.put("shortfall", e.getShortfall());
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(m);
    }

    @ExceptionHandler({RoomFullException.class, RoomNotAcceptingException.class,
                       RoomNotWaitingException.class, PlayerNotInRoomException.class})
    public ResponseEntity<?> handleBadRequest(RuntimeException e) {
        return body(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler({DuplicatePlayerException.class, DuplicateBoostException.class,
                       TemplateInUseException.class, DataIntegrityViolationException.class})
    public ResponseEntity<?> handleConflict(RuntimeException e) {
        return body(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(CreditFailedException.class)
    public ResponseEntity<?> handleCredit(CreditFailedException e) {
        return body(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class,
                       IllegalArgumentException.class})
    public ResponseEntity<?> handleValidation(Exception e) {
        return body(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception e) {
        return body(HttpStatus.INTERNAL_SERVER_ERROR, "internal error: " + e.getMessage());
    }
}
