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

    @ExceptionHandler(RoomNotFoundException.class)
    public ResponseEntity<?> handleNotFound(RoomNotFoundException e) {
        return body(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler({RoomFullException.class, RoomNotAcceptingException.class,
                       RoomNotWaitingException.class, InsufficientBalanceException.class})
    public ResponseEntity<?> handleBadRequest(RuntimeException e) {
        return body(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler({DuplicatePlayerException.class, TemplateInUseException.class})
    public ResponseEntity<?> handleConflict(RuntimeException e) {
        return body(HttpStatus.CONFLICT, e.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrity(DataIntegrityViolationException e) {
        // Likely a unique constraint violation (e.g., duplicate fair_player).
        return body(HttpStatus.CONFLICT, "data integrity violation");
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
