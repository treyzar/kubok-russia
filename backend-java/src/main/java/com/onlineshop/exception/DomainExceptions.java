package com.onlineshop.exception;

public class DomainExceptions {
    public static class RoomNotFoundException extends RuntimeException {
        public RoomNotFoundException(String msg) { super(msg); }
    }
    public static class RoomFullException extends RuntimeException {
        public RoomFullException() { super("room is full"); }
    }
    public static class RoomNotAcceptingException extends RuntimeException {
        public RoomNotAcceptingException() { super("room is not accepting players"); }
    }
    public static class RoomNotWaitingException extends RuntimeException {
        public RoomNotWaitingException() { super("room must be in waiting state to start"); }
    }
    public static class DuplicatePlayerException extends RuntimeException {
        public DuplicatePlayerException() { super("user already in this room"); }
    }
    public static class CreditFailedException extends RuntimeException {
        public CreditFailedException(String msg) { super(msg); }
    }
    public static class InsufficientBalanceException extends RuntimeException {
        public InsufficientBalanceException() { super("insufficient balance"); }
    }
    public static class TemplateInUseException extends RuntimeException {
        public TemplateInUseException(String msg) { super(msg); }
    }
    public static class PlayerNotInRoomException extends RuntimeException {
        public PlayerNotInRoomException() { super("player not in room"); }
    }
    private DomainExceptions() {}
}
