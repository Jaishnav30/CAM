package com.cams.security;

import com.cams.security.jwt.JwtTokenProvider;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Date;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    private static final String VALID_256_BIT_SECRET = "4a72d3f9e8b1c5a6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0";
    private static final String SHORT_SECRET = "too-short-secret-key-12345"; // Less than 32 bytes

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", VALID_256_BIT_SECRET);
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationInMs", 86400000L); // 24 hours (1 day)
        tokenProvider.init();
    }

    @Test
    @DisplayName("Should fail initialization if JWT secret is null or blank")
    void shouldFailIfSecretIsBlank() {
        JwtTokenProvider invalidProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(invalidProvider, "jwtSecret", "");

        assertThatThrownBy(invalidProvider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CAMS_JWT_SECRET environment variable is missing or empty");
    }

    @Test
    @DisplayName("Should fail initialization if JWT secret is less than 256 bits (32 bytes)")
    void shouldFailIfSecretIsUnder256Bits() {
        JwtTokenProvider invalidProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(invalidProvider, "jwtSecret", SHORT_SECRET);

        assertThatThrownBy(invalidProvider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("must be at least 256 bits (32 bytes)");
    }

    @Test
    @DisplayName("Should successfully generate and validate a valid JWT token")
    void shouldGenerateAndValidateToken() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = UserPrincipal.builder()
                .id(userId)
                .email("admin@cams.local")
                .fullName("System Administrator")
                .active(true)
                .roles(Set.of("ADMIN"))
                .permissions(Set.of("users:read", "transactions:read"))
                .authorities(Collections.emptyList())
                .build();

        String token = tokenProvider.generateAccessToken(principal);
        assertThat(token).isNotBlank();

        boolean isValid = tokenProvider.validateToken(token);
        assertThat(isValid).isTrue();

        UUID extractedId = tokenProvider.getUserIdFromToken(token);
        assertThat(extractedId).isEqualTo(userId);
    }

    @Test
    @DisplayName("Should reject tampered or corrupted JWT token")
    void shouldRejectTamperedToken() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = UserPrincipal.builder()
                .id(userId)
                .email("user@cams.local")
                .active(true)
                .roles(Set.of("MEMBER"))
                .permissions(Set.of("transactions:create_own"))
                .authorities(Collections.emptyList())
                .build();

        String token = tokenProvider.generateAccessToken(principal);
        String tamperedToken = token.substring(0, token.length() - 5) + "abcde";

        boolean isValid = tokenProvider.validateToken(tamperedToken);
        assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should reject expired JWT token")
    void shouldRejectExpiredToken() {
        UUID userId = UUID.randomUUID();
        SecretKey key = Keys.hmacShaKeyFor(VALID_256_BIT_SECRET.getBytes(StandardCharsets.UTF_8));

        // Generate token expired 1 hour ago
        Date now = new Date();
        Date past = new Date(now.getTime() - 3600000);

        String expiredToken = Jwts.builder()
                .subject(userId.toString())
                .claim("email", "expired@cams.local")
                .issuedAt(new Date(now.getTime() - 7200000))
                .expiration(past)
                .signWith(key, Jwts.SIG.HS256)
                .compact();

        boolean isValid = tokenProvider.validateToken(expiredToken);
        assertThat(isValid).isFalse();
    }
}
