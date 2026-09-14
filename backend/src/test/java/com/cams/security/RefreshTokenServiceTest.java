package com.cams.security;

import com.cams.security.refresh.RefreshToken;
import com.cams.security.refresh.RefreshTokenService;
import com.cams.security.refresh.RefreshTokenStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RefreshTokenServiceTest {

    private RefreshTokenStore tokenStore;
    private RefreshTokenService tokenService;

    @BeforeEach
    void setUp() {
        tokenStore = new RefreshTokenStore();
        tokenService = new RefreshTokenService(tokenStore);
        ReflectionTestUtils.setField(tokenService, "refreshTokenExpirationMs", 604800000L); // 7 days
    }

    @Test
    @DisplayName("Should create active refresh token with valid properties")
    void shouldCreateRefreshToken() {
        UUID userId = UUID.randomUUID();
        RefreshToken token = tokenService.createRefreshToken(userId);

        assertThat(token).isNotNull();
        assertThat(token.getToken()).isNotBlank();
        assertThat(token.getUserId()).isEqualTo(userId);
        assertThat(token.isRevoked()).isFalse();
        assertThat(token.getFamilyId()).isNotBlank();
        assertThat(token.getExpiresAt()).isAfter(Instant.now());

        Optional<RefreshToken> stored = tokenStore.findByToken(token.getToken());
        assertThat(stored).isPresent();
        assertThat(stored.get().getToken()).isEqualTo(token.getToken());
    }

    @Test
    @DisplayName("Should rotate refresh token and revoke the previous token")
    void shouldRotateRefreshTokenSuccessfully() {
        UUID userId = UUID.randomUUID();
        RefreshToken initialToken = tokenService.createRefreshToken(userId);

        RefreshToken rotatedToken = tokenService.rotateRefreshToken(initialToken.getToken());

        assertThat(rotatedToken).isNotNull();
        assertThat(rotatedToken.getToken()).isNotEqualTo(initialToken.getToken());
        assertThat(rotatedToken.getUserId()).isEqualTo(userId);
        assertThat(rotatedToken.getFamilyId()).isEqualTo(initialToken.getFamilyId());
        assertThat(rotatedToken.isRevoked()).isFalse();

        // Previous token must now be revoked
        Optional<RefreshToken> oldTokenStored = tokenStore.findByToken(initialToken.getToken());
        assertThat(oldTokenStored).isPresent();
        assertThat(oldTokenStored.get().isRevoked()).isTrue();
    }

    @Test
    @DisplayName("Should detect token reuse and revoke all tokens in family (compromise detection)")
    void shouldDetectTokenReuseAndRevokeFamily() {
        UUID userId = UUID.randomUUID();
        RefreshToken initialToken = tokenService.createRefreshToken(userId);

        // First rotation succeeds
        RefreshToken rotatedToken = tokenService.rotateRefreshToken(initialToken.getToken());
        assertThat(rotatedToken.isRevoked()).isFalse();

        // Attacker attempts to reuse the already-rotated initialToken
        assertThatThrownBy(() -> tokenService.rotateRefreshToken(initialToken.getToken()))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Revoked refresh token reused. All sessions invalidated.");

        // Both initialToken and rotatedToken in the same family must now be revoked
        Optional<RefreshToken> oldCheck = tokenStore.findByToken(initialToken.getToken());
        Optional<RefreshToken> rotatedCheck = tokenStore.findByToken(rotatedToken.getToken());

        assertThat(oldCheck).isPresent();
        assertThat(oldCheck.get().isRevoked()).isTrue();

        assertThat(rotatedCheck).isPresent();
        assertThat(rotatedCheck.get().isRevoked()).isTrue();
    }

    @Test
    @DisplayName("Should revoke token on logout")
    void shouldRevokeTokenOnLogout() {
        UUID userId = UUID.randomUUID();
        RefreshToken token = tokenService.createRefreshToken(userId);

        tokenService.revokeToken(token.getToken());

        Optional<RefreshToken> stored = tokenStore.findByToken(token.getToken());
        assertThat(stored).isPresent();
        assertThat(stored.get().isRevoked()).isTrue();
    }

    @Test
    @DisplayName("Should reject rotation of non-existent token")
    void shouldRejectNonExistentToken() {
        assertThatThrownBy(() -> tokenService.rotateRefreshToken("non-existent-token"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid refresh token");
    }
}
