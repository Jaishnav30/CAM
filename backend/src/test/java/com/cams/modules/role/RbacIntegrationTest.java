package com.cams.modules.role;

import com.cams.modules.audit.model.AuditLog;
import com.cams.modules.audit.repository.AuditLogRepository;
import com.cams.modules.permission.model.Permission;
import com.cams.modules.permission.repository.PermissionRepository;
import com.cams.modules.role.dto.UpdateRbacMatrixRequest;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.cams.security.UserPrincipal;
import com.cams.security.jwt.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
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

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.admin.email=admin@cams.local",
        "app.security.admin.password=AdminTestPassword123!",
        "app.security.cookie.secure=false"
})
class RbacIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String adminToken;
    private String memberToken;

    @BeforeEach
    void setUp() {
        User admin = userRepository.findByEmailIgnoreCase("admin@cams.local").orElseThrow();
        adminToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(admin));

        User member = userRepository.findByEmailIgnoreCase("rbac_member@cams.local").orElseGet(() -> {
            Role memberRole = roleRepository.findByName("MEMBER").orElseThrow();
            User u = User.builder()
                    .email("rbac_member@cams.local")
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .fullName("RBAC Member")
                    .roles(Set.of(memberRole))
                    .isActive(true)
                    .build();
            return userRepository.save(u);
        });
        memberToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(member));
    }

    @AfterEach
    void resetDefaultRolePermissions() {
        restoreRolePermissions("ACCOUNTANT", List.of(
                "users:read", "categories:read", "payment_modes:read", "transactions:read",
                "transactions:create_own", "transactions:create", "transactions:update",
                "documents:read", "documents:upload", "documents:delete",
                "reimbursements:read", "reimbursements:submit", "reimbursements:review",
                "reimbursements:approve", "reimbursements:reject", "reimbursements:mark_paid",
                "reports:read", "reports:generate", "analytics:read"
        ));

        restoreRolePermissions("MEMBER", List.of(
                "categories:read", "payment_modes:read", "transactions:create_own",
                "documents:upload", "reimbursements:submit"
        ));
    }

    private void restoreRolePermissions(String roleName, List<String> codes) {
        roleRepository.findByName(roleName).ifPresent(role -> {
            List<Permission> permissions = permissionRepository.findByCodeIn(codes);
            role.setPermissions(new HashSet<>(permissions));
            roleRepository.save(role);
        });
    }

    @Test
    @DisplayName("1. Admin can fetch RBAC matrix with all permissions, configurable roles, and role-permission mappings")
    void adminCanFetchRbacMatrix() throws Exception {
        mockMvc.perform(get("/api/v1/admin/rbac/matrix")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.roles", hasSize(2)))
                .andExpect(jsonPath("$.data.roles", containsInAnyOrder("ACCOUNTANT", "MEMBER")))
                .andExpect(jsonPath("$.data.permissions", hasSize(greaterThanOrEqualTo(20))))
                .andExpect(jsonPath("$.data.modules", hasItems("TRANSACTION", "REIMBURSEMENT", "DOCUMENT", "CATEGORY")))
                .andExpect(jsonPath("$.data.rolePermissions.ACCOUNTANT").isArray())
                .andExpect(jsonPath("$.data.rolePermissions.MEMBER").isArray());
    }

    @Test
    @DisplayName("2. Member is forbidden from fetching RBAC matrix")
    void memberCannotFetchRbacMatrix() throws Exception {
        mockMvc.perform(get("/api/v1/admin/rbac/matrix")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("3. Unauthenticated request to RBAC matrix returns 401")
    void unauthenticatedCannotFetchRbacMatrix() throws Exception {
        mockMvc.perform(get("/api/v1/admin/rbac/matrix"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("4. Admin can update RBAC permissions matrix and audit log is recorded")
    void adminCanUpdateRbacMatrix() throws Exception {
        // Prepare updated permissions map
        Map<String, Set<String>> newRolePermissions = new HashMap<>();
        newRolePermissions.put("MEMBER", Set.of("transactions:read", "reimbursements:submit", "documents:upload"));
        newRolePermissions.put("ACCOUNTANT", Set.of("transactions:read", "transactions:create", "reimbursements:review", "reports:read"));

        UpdateRbacMatrixRequest request = UpdateRbacMatrixRequest.builder()
                .rolePermissions(newRolePermissions)
                .build();

        mockMvc.perform(put("/api/v1/admin/rbac/matrix")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rolePermissions.MEMBER", hasSize(3)))
                .andExpect(jsonPath("$.data.rolePermissions.MEMBER", containsInAnyOrder("transactions:read", "reimbursements:submit", "documents:upload")))
                .andExpect(jsonPath("$.data.rolePermissions.ACCOUNTANT", hasSize(4)))
                .andExpect(jsonPath("$.data.rolePermissions.ACCOUNTANT", containsInAnyOrder("transactions:read", "transactions:create", "reimbursements:review", "reports:read")));

        // Verify audit log
        List<AuditLog> auditLogs = auditLogRepository.findAll();
        boolean foundRbacAudit = auditLogs.stream()
                .anyMatch(log -> "ROLE".equals(log.getEntityType()) && "UPDATE".equals(log.getAction()));
        assertThat(foundRbacAudit).isTrue();
    }

    @Test
    @DisplayName("5. Member is forbidden from updating RBAC matrix")
    void memberCannotUpdateRbacMatrix() throws Exception {
        UpdateRbacMatrixRequest request = UpdateRbacMatrixRequest.builder()
                .rolePermissions(Map.of("MEMBER", Set.of("transactions:read")))
                .build();

        mockMvc.perform(put("/api/v1/admin/rbac/matrix")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}
