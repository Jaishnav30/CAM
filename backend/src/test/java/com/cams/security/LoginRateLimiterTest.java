package com.cams.security;

import com.cams.security.ratelimit.LoginRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRateLimiterTest {

    private LoginRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter = new LoginRateLimiter();
    }

    @Test
    @DisplayName("Should not block user with fewer than 5 failed attempts")
    void shouldNotBlockUnderThreshold() {
        String ip = "192.168.1.100";
        String email = "test@cams.local";

        for (int i = 0; i < 4; i++) {
            rateLimiter.recordFailedAttempt(ip, email);
            assertThat(rateLimiter.isBlocked(ip, email)).isFalse();
        }
    }

    @Test
    @DisplayName("Should block user after 5 consecutive failed attempts for 15 minutes")
    void shouldBlockAfterFiveFailedAttempts() {
        String ip = "192.168.1.100";
        String email = "test@cams.local";

        for (int i = 0; i < 5; i++) {
            rateLimiter.recordFailedAttempt(ip, email);
        }

        assertThat(rateLimiter.isBlocked(ip, email)).isTrue();
        assertThat(rateLimiter.getRemainingLockoutSeconds(ip, email)).isGreaterThan(0);
    }

    @Test
    @DisplayName("Should reset counter upon successful login")
    void shouldResetCounterOnSuccessfulLogin() {
        String ip = "192.168.1.100";
        String email = "test@cams.local";

        for (int i = 0; i < 4; i++) {
            rateLimiter.recordFailedAttempt(ip, email);
        }

        rateLimiter.recordSuccessfulLogin(ip, email);

        // After successful login, 4 more failed attempts shouldn't block
        for (int i = 0; i < 4; i++) {
            rateLimiter.recordFailedAttempt(ip, email);
            assertThat(rateLimiter.isBlocked(ip, email)).isFalse();
        }
    }

    @Test
    @DisplayName("Should isolate rate limits across different IP addresses and emails")
    void shouldIsolateDifferentKeys() {
        String ip1 = "10.0.0.1";
        String ip2 = "10.0.0.2";
        String email = "user@cams.local";

        for (int i = 0; i < 5; i++) {
            rateLimiter.recordFailedAttempt(ip1, email);
        }

        assertThat(rateLimiter.isBlocked(ip1, email)).isTrue();
        assertThat(rateLimiter.isBlocked(ip2, email)).isFalse();
    }
}
