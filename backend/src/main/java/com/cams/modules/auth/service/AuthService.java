package com.cams.modules.auth.service;

import com.cams.exception.AccountLockedException;
import com.cams.exception.ConflictException;
import com.cams.exception.InvalidTokenException;
import com.cams.exception.ResourceNotFoundException;
import com.cams.modules.auth.dto.AuthResponse;
import com.cams.modules.auth.dto.LoginRequest;
import com.cams.modules.auth.dto.RegisterRequest;
import com.cams.modules.auth.dto.UserProfileResponse;
import com.cams.modules.auth.dto.UserSummaryDto;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.user.model.ApprovalStatus;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.cams.security.CustomUserDetailsService;
import com.cams.security.UserPrincipal;
import com.cams.security.jwt.JwtTokenProvider;
import com.cams.security.ratelimit.LoginRateLimiter;
import com.cams.security.refresh.RefreshToken;
import com.cams.security.refresh.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cams.modules.auth.dto.SendOtpRequest;
import com.cams.modules.auth.model.EmailVerification;
import com.cams.modules.auth.repository.EmailVerificationRepository;
import com.cams.modules.common.service.EmailService;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    public static final String REFRESH_TOKEN_COOKIE_NAME = "cams_refresh_token";

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final CustomUserDetailsService userDetailsService;
    private final LoginRateLimiter loginRateLimiter;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationRepository emailVerificationRepository;
    private final EmailService emailService;

    @Value("${app.security.cookie.secure:true}")
    private boolean cookieSecure;

    @Transactional
    public void sendVerificationOtp(SendOtpRequest request) {
        String cleanEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new ConflictException("An account with email '" + cleanEmail + "' is already registered");
        }

        // Rate limit: 60 seconds cooldown between code requests
        Optional<EmailVerification> lastOtpOpt = emailVerificationRepository.findTopByEmailIgnoreCaseOrderByCreatedAtDesc(cleanEmail);
        if (lastOtpOpt.isPresent()) {
            EmailVerification lastOtp = lastOtpOpt.get();
            if (lastOtp.getCreatedAt() != null && lastOtp.getCreatedAt().isAfter(Instant.now().minusSeconds(60))) {
                long waitSecs = 60 - Duration.between(lastOtp.getCreatedAt(), Instant.now()).toSeconds();
                throw new IllegalArgumentException("Please wait " + Math.max(1, waitSecs) + " seconds before requesting another code.");
            }
        }

        // Generate cryptographically secure 6-digit number between 100000 and 999999
        int code = new java.security.SecureRandom().nextInt(900000) + 100000;
        String otpCode = String.valueOf(code);

        EmailVerification verification = EmailVerification.builder()
                .email(cleanEmail)
                .otpCode(otpCode)
                .attempts(0)
                .expiresAt(Instant.now().plus(10, ChronoUnit.MINUTES))
                .verified(false)
                .build();

        emailVerificationRepository.save(verification);

        emailService.sendVerificationEmail(cleanEmail, request.getUsername(), otpCode);
        log.info("Dispatched verification OTP to {}", cleanEmail);
    }

    @Transactional
    public void register(RegisterRequest request) {
        if (request.getPassword() == null || request.getPassword().length() < 7) {
            throw new IllegalArgumentException("Password must be at least 7 characters long");
        }
        if (request.getConfirmPassword() != null && !request.getPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        String roleName = request.getRequestedRole() != null ? request.getRequestedRole().trim().toUpperCase() : "MEMBER";
        if (!roleName.equals("MEMBER") && !roleName.equals("ACCOUNTANT")) {
            throw new IllegalArgumentException("Self-registration is only allowed for Member and Accountant roles.");
        }

        String cleanEmail = request.getEmail().trim().toLowerCase();
        String cleanUsername = request.getUsername().trim();

        if (userRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new ConflictException("An account with email '" + cleanEmail + "' is already registered");
        }
        if (userRepository.existsByUsernameIgnoreCase(cleanUsername)) {
            throw new ConflictException("Username '" + cleanUsername + "' is already taken");
        }

        // Verify 6-digit email OTP
        if (request.getOtp() == null || request.getOtp().trim().length() != 6) {
            throw new IllegalArgumentException("A valid 6-digit email verification code is required");
        }

        EmailVerification verification = emailVerificationRepository
                .findTopByEmailIgnoreCaseOrderByCreatedAtDesc(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("No verification code found for " + cleanEmail + ". Please request a verification code first."));

        if (verification.isExpired()) {
            throw new IllegalArgumentException("Verification code has expired. Please request a new code.");
        }

        if (verification.getAttempts() >= 5) {
            throw new IllegalArgumentException("Too many incorrect attempts. Please request a new verification code.");
        }

        if (!verification.getOtpCode().equals(request.getOtp().trim())) {
            verification.setAttempts(verification.getAttempts() + 1);
            emailVerificationRepository.save(verification);
            int remaining = 5 - verification.getAttempts();
            throw new IllegalArgumentException("Invalid verification code. " + (remaining > 0 ? remaining + " attempt(s) remaining." : "Please request a new code."));
        }

        verification.setVerified(true);
        emailVerificationRepository.save(verification);

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role " + roleName + " not found"));

        String fullName = request.getFullName() != null && !request.getFullName().isBlank()
                ? request.getFullName().trim()
                : cleanUsername;

        User user = User.builder()
                .username(cleanUsername)
                .email(cleanEmail)
                .fullName(fullName)
                .avatarUrl(request.getAvatarUrl())
                .batch(request.getBatch() != null ? request.getBatch().trim() : null)
                .committee(request.getCommittee() != null ? request.getCommittee().trim() : null)
                .upiId(request.getUpiId() != null && !request.getUpiId().isBlank() ? request.getUpiId().trim() : null)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .approvalStatus(ApprovalStatus.PENDING)
                .isActive(false)
                .roles(new HashSet<>(Set.of(role)))
                .build();

        userRepository.save(user);
        log.info("New registration submitted for username: {}, email: {}, requested role: {}", cleanUsername, cleanEmail, roleName);
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String clientIp = extractClientIp(httpRequest);
        String cleanInput = request.getEmail().trim().toLowerCase();

        // Check if user exists by email or username to inspect registration approval status
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(cleanInput);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsernameIgnoreCase(cleanInput);
        }

        if (userOpt.isPresent()) {
            User existingUser = userOpt.get();
            if (existingUser.getApprovalStatus() == ApprovalStatus.PENDING) {
                throw new AccountLockedException("Your registration is pending administrator approval. Please wait until an admin approves your account.");
            }
            if (existingUser.getApprovalStatus() == ApprovalStatus.REJECTED) {
                String reason = existingUser.getRejectionReason() != null && !existingUser.getRejectionReason().isBlank()
                        ? existingUser.getRejectionReason()
                        : "Please contact club administrator.";
                throw new AccountLockedException("Your registration was rejected by the administrator. Reason: " + reason);
            }
            if (existingUser.isDeleted()) {
                throw new AccountLockedException("This account has been permanently deleted. Please contact administrator.");
            }
            if (!existingUser.isActive()) {
                throw new AccountLockedException("This account has been blocked by the administrator. Please contact support.");
            }
        }

        String authEmail = userOpt.map(User::getEmail).orElse(cleanInput);

        if (loginRateLimiter.isBlocked(clientIp, authEmail)) {
            long remainingSec = loginRateLimiter.getRemainingLockoutSeconds(clientIp, authEmail);
            throw new AccountLockedException(
                "Account temporarily locked due to multiple failed login attempts. Please try again after " + remainingSec + " seconds."
            );
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(authEmail, request.getPassword())
            );
        } catch (BadCredentialsException ex) {
            loginRateLimiter.recordFailedAttempt(clientIp, authEmail);
            throw ex;
        }

        loginRateLimiter.recordSuccessfulLogin(clientIp, authEmail);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

        String accessToken = jwtTokenProvider.generateAccessToken(principal);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(principal.getId());

        setRefreshTokenCookie(httpResponse, refreshToken.getToken(), Duration.ofDays(7));

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .expiresInMs(jwtTokenProvider.getExpirationInMs())
                .user(UserSummaryDto.builder()
                        .id(principal.getId())
                        .email(principal.getEmail())
                        .fullName(principal.getFullName())
                        .username(principal.getProfileUsername())
                        .avatarUrl(principal.getAvatarUrl())
                        .batch(principal.getBatch())
                        .committee(principal.getCommittee())
                        .roles(principal.getRoles())
                        .build())
                .build();
    }

    public AuthResponse refresh(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String currentToken = extractCookieValue(httpRequest, REFRESH_TOKEN_COOKIE_NAME);
        if (currentToken == null || currentToken.isBlank()) {
            throw new InvalidTokenException("Refresh token cookie is missing");
        }

        RefreshToken newRefreshToken;
        try {
            newRefreshToken = refreshTokenService.rotateRefreshToken(currentToken);
        } catch (Exception ex) {
            clearRefreshTokenCookie(httpResponse);
            throw new InvalidTokenException("Invalid or expired refresh token: " + ex.getMessage());
        }

        UserPrincipal principal = (UserPrincipal) userDetailsService.loadUserById(newRefreshToken.getUserId());
        String newAccessToken = jwtTokenProvider.generateAccessToken(principal);

        setRefreshTokenCookie(httpResponse, newRefreshToken.getToken(), Duration.ofDays(7));

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .expiresInMs(jwtTokenProvider.getExpirationInMs())
                .user(UserSummaryDto.builder()
                        .id(principal.getId())
                        .email(principal.getEmail())
                        .fullName(principal.getFullName())
                        .username(principal.getProfileUsername())
                        .avatarUrl(principal.getAvatarUrl())
                        .batch(principal.getBatch())
                        .committee(principal.getCommittee())
                        .roles(principal.getRoles())
                        .build())
                .build();
    }

    public UserProfileResponse getCurrentUser(UserPrincipal principal) {
        return UserProfileResponse.builder()
                .id(principal.getId())
                .email(principal.getEmail())
                .fullName(principal.getFullName())
                .phone(principal.getPhone())
                .username(principal.getProfileUsername())
                .avatarUrl(principal.getAvatarUrl())
                .batch(principal.getBatch())
                .committee(principal.getCommittee())
                .approvalStatus(principal.getApprovalStatus())
                .active(principal.isActive())
                .roles(principal.getRoles())
                .permissions(principal.getPermissions())
                .build();
    }

    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse, UserPrincipal principal) {
        String currentToken = extractCookieValue(httpRequest, REFRESH_TOKEN_COOKIE_NAME);
        if (currentToken != null && !currentToken.isBlank()) {
            refreshTokenService.revokeToken(currentToken);
        }

        if (principal != null) {
            refreshTokenService.revokeAllForUser(principal.getId());
        }

        clearRefreshTokenCookie(httpResponse);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(maxAge)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Strict")
                .path("/api/v1/auth")
                .maxAge(0)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractCookieValue(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
