package com.cams.security.refresh;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenStore tokenStore;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.security.jwt.refresh-token-expiration-ms:604800000}")
    private long refreshTokenExpirationMs; // Default 7 days

    public RefreshToken createRefreshToken(UUID userId) {
        String tokenString = generateSecureTokenString();
        String familyId = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusMillis(refreshTokenExpirationMs);

        RefreshToken token = RefreshToken.builder()
                .token(tokenString)
                .userId(userId)
                .expiresAt(expiresAt)
                .revoked(false)
                .familyId(familyId)
                .build();

        tokenStore.save(token);
        return token;
    }

    public RefreshToken rotateRefreshToken(String currentTokenString) {
        RefreshToken currentToken = tokenStore.findByToken(currentTokenString)
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (currentToken.isRevoked()) {
            // Compromise detection: An already-revoked refresh token is being reused!
            log.error("SECURITY ALERT: Refresh token reuse detected for family {}. Revoking entire family.", currentToken.getFamilyId());
            tokenStore.revokeFamily(currentToken.getFamilyId());
            tokenStore.revokeAllForUser(currentToken.getUserId());
            throw new SecurityException("Security violation: Revoked refresh token reused. All sessions invalidated.");
        }

        if (currentToken.isExpired()) {
            tokenStore.revoke(currentTokenString);
            throw new IllegalArgumentException("Refresh token has expired");
        }

        // Revoke the used token
        tokenStore.revoke(currentTokenString);

        // Issue a new token within the same token family
        String newTokenString = generateSecureTokenString();
        Instant expiresAt = Instant.now().plusMillis(refreshTokenExpirationMs);

        RefreshToken newToken = RefreshToken.builder()
                .token(newTokenString)
                .userId(currentToken.getUserId())
                .expiresAt(expiresAt)
                .revoked(false)
                .familyId(currentToken.getFamilyId())
                .build();

        tokenStore.save(newToken);
        return newToken;
    }

    public void revokeToken(String tokenString) {
        tokenStore.revoke(tokenString);
    }

    public void revokeAllForUser(UUID userId) {
        tokenStore.revokeAllForUser(userId);
    }

    private String generateSecureTokenString() {
        byte[] randomBytes = new byte[48];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}
