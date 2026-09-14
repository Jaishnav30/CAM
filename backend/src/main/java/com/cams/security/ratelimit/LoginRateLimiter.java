package com.cams.security.ratelimit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class LoginRateLimiter {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final long LOCKOUT_DURATION_MS = 15 * 60 * 1000L; // 15 minutes

    private static class AttemptRecord {
        int attempts;
        Instant lockoutUntil;

        AttemptRecord(int attempts) {
            this.attempts = attempts;
            this.lockoutUntil = null;
        }
    }

    private final Map<String, AttemptRecord> cache = new ConcurrentHashMap<>();

    private String buildKey(String ip, String email) {
        String cleanIp = (ip == null || ip.isBlank()) ? "unknown" : ip.trim();
        String cleanEmail = (email == null || email.isBlank()) ? "unknown" : email.trim().toLowerCase();
        return cleanIp + "|" + cleanEmail;
    }

    public boolean isBlocked(String ip, String email) {
        String key = buildKey(ip, email);
        AttemptRecord record = cache.get(key);

        if (record == null) {
            return false;
        }

        if (record.lockoutUntil != null) {
            if (Instant.now().isBefore(record.lockoutUntil)) {
                return true;
            } else {
                // Lockout expired, reset record
                cache.remove(key);
                return false;
            }
        }

        return false;
    }

    public long getRemainingLockoutSeconds(String ip, String email) {
        String key = buildKey(ip, email);
        AttemptRecord record = cache.get(key);
        if (record != null && record.lockoutUntil != null) {
            long remaining = record.lockoutUntil.getEpochSecond() - Instant.now().getEpochSecond();
            return Math.max(0, remaining);
        }
        return 0;
    }

    public void recordFailedAttempt(String ip, String email) {
        String key = buildKey(ip, email);
        cache.compute(key, (k, record) -> {
            if (record == null) {
                return new AttemptRecord(1);
            }

            if (record.lockoutUntil != null && Instant.now().isAfter(record.lockoutUntil)) {
                // Previous lockout expired, start fresh
                return new AttemptRecord(1);
            }

            record.attempts++;
            if (record.attempts >= MAX_FAILED_ATTEMPTS) {
                record.lockoutUntil = Instant.now().plusMillis(LOCKOUT_DURATION_MS);
                log.warn("SECURITY ALERT: Login rate limit exceeded for key {}. Locked for 15 minutes.", key);
            }
            return record;
        });
    }

    public void recordSuccessfulLogin(String ip, String email) {
        String key = buildKey(ip, email);
        cache.remove(key);
    }

    public void reset() {
        cache.clear();
    }
}
