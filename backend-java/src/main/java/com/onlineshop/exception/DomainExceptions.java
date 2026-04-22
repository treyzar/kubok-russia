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
    public static class DuplicateBoostException extends RuntimeException {
        public DuplicateBoostException() { super("You have already boosted this room"); }
    }
    public static class CreditFailedException extends RuntimeException {
        public CreditFailedException(String msg) { super(msg); }
    }
    public static class InsufficientBalanceException extends RuntimeException {
        public InsufficientBalanceException() { super("insufficient balance"); }
    }
    /** Structured 402 for room-level operations — matches Go InsufficientBalanceError. */
    public static class InsufficientBalanceForRoomException extends RuntimeException {
        private final int required;
        private final int currentBalance;
        public InsufficientBalanceForRoomException(String message, int required, int currentBalance) {
            super(message);
            this.required = required;
            this.currentBalance = currentBalance;
        }
        public int getRequired() { return required; }
        public int getCurrentBalance() { return currentBalance; }
        public int getShortfall() { return Math.max(0, required - currentBalance); }
    }
    public static class TemplateInUseException extends RuntimeException {
        public TemplateInUseException(String msg) { super(msg); }
    }
    public static class PlayerNotInRoomException extends RuntimeException {
        public PlayerNotInRoomException() { super("player not in room"); }
    }
    private DomainExceptions() {}
}
