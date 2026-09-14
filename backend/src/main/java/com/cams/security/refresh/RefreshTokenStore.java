package com.cams.security.refresh;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class RefreshTokenStore {

    private final Map<String, RefreshToken> store = new ConcurrentHashMap<>();

    public void save(RefreshToken token) {
        store.put(token.getToken(), token);
        cleanExpiredTokens();
    }

    public Optional<RefreshToken> findByToken(String token) {
        if (token == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(store.get(token));
    }

    public void revoke(String token) {
        RefreshToken existing = store.get(token);
        if (existing != null) {
            existing.setRevoked(true);
            store.put(token, existing);
        }
    }

    public void revokeFamily(String familyId) {
        if (familyId == null) return;
        store.values().stream()
                .filter(t -> familyId.equals(t.getFamilyId()))
                .forEach(t -> t.setRevoked(true));
        log.warn("Revoked all refresh tokens in family: {}", familyId);
    }

    public void revokeAllForUser(UUID userId) {
        if (userId == null) return;
        store.values().stream()
                .filter(t -> userId.equals(t.getUserId()))
                .forEach(t -> t.setRevoked(true));
        log.info("Revoked all refresh tokens for user: {}", userId);
    }

    private void cleanExpiredTokens() {
        if (store.size() > 500) {
            Instant now = Instant.now();
            store.entrySet().removeIf(entry -> entry.getValue().getExpiresAt().isBefore(now));
        }
    }
}
