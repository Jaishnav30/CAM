package com.cams.modules.auth;

import com.cams.modules.auth.dto.LoginRequest;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.cams.security.ratelimit.LoginRateLimiter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.admin.email=admin@cams.local",
        "app.security.admin.password=AdminTestPassword123!",
        "app.security.cookie.secure=false"
})
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LoginRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        rateLimiter.reset();
        userRepository.findByEmailIgnoreCase("admin@cams.local").ifPresent(admin -> {
            admin.setPasswordHash(passwordEncoder.encode("Password123!"));
            userRepository.save(admin);
        });
    }

    @Test
    @DisplayName("1. Verify Admin Bootstrap created the initial ADMIN user with BCrypt hashed password")
    void verifyAdminBootstrapUser() {
        var adminOpt = userRepository.findByEmailIgnoreCase("admin@cams.local");
        assertThat(adminOpt).isPresent();

        User admin = adminOpt.get();
        assertThat(admin.getEmail()).isEqualTo("admin@cams.local");
        assertThat(admin.isActive()).isTrue();
        assertThat(admin.getPasswordHash()).startsWith("$2a$12$");
        assertThat(passwordEncoder.matches("Password123!", admin.getPasswordHash())).isTrue();
        assertThat(admin.getRoles()).anyMatch(r -> "ADMIN".equals(r.getName()));
    }

    @Test
    @DisplayName("2. Successful login returns 200, JWT access token, and sets HttpOnly refresh cookie")
    void successfulLogin() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("admin@cams.local")
                .password("Password123!")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none';"))
                .andExpect(cookie().exists("cams_refresh_token"))
                .andExpect(cookie().httpOnly("cams_refresh_token", true))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresInMs").value(900000))
                .andExpect(jsonPath("$.data.user.email").value("admin@cams.local"))
                .andExpect(jsonPath("$.data.user.roles", hasItem("ADMIN")))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andReturn();

        Cookie refreshCookie = result.getResponse().getCookie("cams_refresh_token");
        assertThat(refreshCookie).isNotNull();
        assertThat(refreshCookie.getValue()).isNotBlank();
        assertThat(refreshCookie.isHttpOnly()).isTrue();
    }

    @Test
    @DisplayName("3. Login with invalid password returns 401 Unauthorized")
    void loginWithBadCredentials() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("admin@cams.local")
                .password("WrongPassword999!")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andExpect(cookie().doesNotExist("cams_refresh_token"));
    }

    @Test
    @DisplayName("4. Rate limiting: 5 consecutive failed logins triggers 429 Too Many Requests lockout")
    void loginRateLimitingAfterFiveFailures() throws Exception {
        LoginRequest badRequest = LoginRequest.builder()
                .email("admin@cams.local")
                .password("WrongPassword")
                .build();

        // 4 failed attempts -> 401
        for (int i = 0; i < 4; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(badRequest)))
                    .andExpect(status().isUnauthorized());
        }

        // 5th failed attempt -> 401 (triggers lockout)
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isUnauthorized());

        // 6th attempt (even with valid or invalid password) -> 429 Locked Out!
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Account temporarily locked due to multiple failed login attempts")));
    }

    @Test
    @DisplayName("5. GET /api/v1/auth/me without token returns 401 Unauthorized")
    void getMeWithoutTokenReturns401() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Full authentication is required")));
    }

    @Test
    @DisplayName("6. GET /api/v1/auth/me with valid Bearer token returns complete profile and permissions")
    void getMeWithValidTokenReturnsProfile() throws Exception {
        String token = obtainAdminAccessToken();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("admin@cams.local"))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.roles", hasItem("ADMIN")))
                .andExpect(jsonPath("$.data.permissions", hasItems("users:read", "transactions:create", "reports:read")));
    }

    @Test
    @DisplayName("7. Refresh token endpoint rotates refresh token and returns fresh access token")
    void refreshTokenRotation() throws Exception {
        // Step 1: Login to get initial cookies
        LoginRequest request = LoginRequest.builder()
                .email("admin@cams.local")
                .password("Password123!")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie initialCookie = loginResult.getResponse().getCookie("cams_refresh_token");
        assertThat(initialCookie).isNotNull();

        // Step 2: Use cookie to refresh
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(initialCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(cookie().exists("cams_refresh_token"))
                .andReturn();

        Cookie rotatedCookie = refreshResult.getResponse().getCookie("cams_refresh_token");
        assertThat(rotatedCookie).isNotNull();
        assertThat(rotatedCookie.getValue()).isNotEqualTo(initialCookie.getValue());

        // Step 3: Verify the new access token is valid
        String newAccessToken = objectMapper.readTree(refreshResult.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + newAccessToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("8. Logout revokes refresh token, clears cookie, and invalidates session")
    void logoutRevocation() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("admin@cams.local")
                .password("Password123!")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
        Cookie refreshCookie = loginResult.getResponse().getCookie("cams_refresh_token");

        // Logout
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + token)
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("cams_refresh_token", 0));

        // Attempting to refresh with the revoked cookie should fail
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("9. RBAC: Role and permission authorization via method security (401/403 checks)")
    void rbacMethodSecurityChecks() throws Exception {
        String adminToken = obtainAdminAccessToken();

        // 9a: Admin has ROLE_ADMIN and users:read
        mockMvc.perform(get("/api/v1/test/rbac/admin-only")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("Admin access granted"));

        mockMvc.perform(get("/api/v1/test/rbac/users-read")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("users:read granted"));

        // 9b: Create a regular MEMBER user without admin role or users:read permission
        userRepository.findByEmailIgnoreCase("regular.member@cams.local")
                .ifPresent(userRepository::delete);

        Role memberRole = roleRepository.findByName("MEMBER").orElseThrow();
        User memberUser = User.builder()
                .email("regular.member@cams.local")
                .passwordHash(passwordEncoder.encode("MemberPass123!"))
                .fullName("Regular Member")
                .isActive(true)
                .roles(Set.of(memberRole))
                .build();
        userRepository.save(memberUser);

        // Login as MEMBER
        LoginRequest memberLogin = LoginRequest.builder()
                .email("regular.member@cams.local")
                .password("MemberPass123!")
                .build();

        MvcResult memberResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(memberLogin)))
                .andExpect(status().isOk())
                .andReturn();

        String memberToken = objectMapper.readTree(memberResult.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        // 9c: MEMBER accessing admin-only endpoint gets 403 Forbidden!
        mockMvc.perform(get("/api/v1/test/rbac/admin-only")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Access denied")));

        // 9d: MEMBER has transactions:create_own, but not transactions:create (unscoped) -> 403 Forbidden
        mockMvc.perform(get("/api/v1/test/rbac/transactions-create")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());
    }

    private String obtainAdminAccessToken() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("admin@cams.local")
                .password("Password123!")
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
    }
}
