package com.cams.exception;

public class ClaimLockedException extends ConflictException {
    public ClaimLockedException(String message) {
        super(message);
    }
}
