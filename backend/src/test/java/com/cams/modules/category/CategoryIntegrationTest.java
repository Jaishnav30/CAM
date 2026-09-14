package com.cams.modules.category;

import com.cams.modules.audit.model.AuditLog;
import com.cams.modules.audit.repository.AuditLogRepository;
import com.cams.modules.category.dto.CreateCategoryRequest;
import com.cams.modules.category.dto.UpdateCategoryRequest;
import com.cams.modules.category.model.Category;
import com.cams.modules.category.model.CategoryType;
import com.cams.modules.category.repository.CategoryRepository;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.cams.security.UserPrincipal;
import com.cams.security.jwt.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.admin.email=admin@cams.local",
        "app.security.admin.password=AdminTestPassword123!",
        "app.security.cookie.secure=false"
})
class CategoryIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

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

        User member = userRepository.findByEmailIgnoreCase("cat_member@cams.local").orElseGet(() -> {
            Role memberRole = roleRepository.findByName("MEMBER").orElseThrow();
            User u = User.builder()
                    .email("cat_member@cams.local")
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .fullName("Category Member")
                    .roles(Set.of(memberRole))
                    .isActive(true)
                    .build();
            return userRepository.save(u);
        });
        memberToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(member));
    }

    @Test
    @DisplayName("1. Authenticated member can read active categories")
    void memberCanReadActiveCategories() throws Exception {
        mockMvc.perform(get("/api/v1/categories")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(5))))
                .andExpect(jsonPath("$.data[0].id").exists())
                .andExpect(jsonPath("$.data[0].name").exists());
    }

    @Test
    @DisplayName("2. ADMIN can create a new category and audit log is recorded")
    void adminCanCreateCategory() throws Exception {
        String catName = "Test Logistics " + UUID.randomUUID().toString().substring(0, 8);
        CreateCategoryRequest request = CreateCategoryRequest.builder()
                .name(catName)
                .type(CategoryType.EXPENSE)
                .description("Logistics and van rental")
                .build();

        mockMvc.perform(post("/api/v1/admin/categories")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value(catName))
                .andExpect(jsonPath("$.data.type").value("EXPENSE"))
                .andExpect(jsonPath("$.data.active").value(true));

        // Verify audit log
        Category savedCat = categoryRepository.findByNameIgnoreCase(catName).orElseThrow();
        List<AuditLog> audits = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("CATEGORY", savedCat.getId());
        assertThat(audits).isNotEmpty();
        assertThat(audits.getFirst().getAction()).isEqualTo("CREATE");
    }

    @Test
    @DisplayName("3. Duplicate category name is rejected with 409 Conflict")
    void duplicateCategoryRejected() throws Exception {
        String dupName = "Dup Cat " + UUID.randomUUID().toString().substring(0, 8);
        categoryRepository.save(Category.builder()
                .name(dupName)
                .type(CategoryType.EXPENSE)
                .isActive(true)
                .build());

        CreateCategoryRequest request = CreateCategoryRequest.builder()
                .name(dupName)
                .type(CategoryType.EXPENSE)
                .description("Duplicate check")
                .build();

        mockMvc.perform(post("/api/v1/admin/categories")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("4. Non-admin (MEMBER) cannot create categories (403 Forbidden)")
    void memberCannotManageCategories() throws Exception {
        CreateCategoryRequest request = CreateCategoryRequest.builder()
                .name("Unauthorized Category")
                .type(CategoryType.EXPENSE)
                .build();

        mockMvc.perform(post("/api/v1/admin/categories")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("5. ADMIN can update and soft-deactivate category")
    void adminCanUpdateAndDeactivateCategory() throws Exception {
        Category cat = categoryRepository.save(Category.builder()
                .name("Deactivatable " + UUID.randomUUID().toString().substring(0, 8))
                .type(CategoryType.INCOME)
                .isActive(true)
                .build());

        // Update
        UpdateCategoryRequest updateReq = UpdateCategoryRequest.builder()
                .name(cat.getName() + " Updated")
                .type(CategoryType.BOTH)
                .description("Updated description")
                .build();

        mockMvc.perform(put("/api/v1/admin/categories/" + cat.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value(cat.getName() + " Updated"))
                .andExpect(jsonPath("$.data.type").value("BOTH"));

        // Deactivate
        mockMvc.perform(patch("/api/v1/admin/categories/" + cat.getId() + "/deactivate")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false));

        // Verify inactive category is not in active listing
        mockMvc.perform(get("/api/v1/categories")
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", not(hasItem(cat.getName() + " Updated"))));
    }

    @Test
    @DisplayName("6. ADMIN can delete category without transactions")
    void adminCanDeleteCategoryWithoutTransactions() throws Exception {
        Category cat = categoryRepository.save(Category.builder()
                .name("Deletable " + UUID.randomUUID().toString().substring(0, 8))
                .type(CategoryType.EXPENSE)
                .isActive(true)
                .build());

        mockMvc.perform(delete("/api/v1/admin/categories/" + cat.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Category deleted successfully"));

        assertThat(categoryRepository.findById(cat.getId())).isEmpty();
    }

    @Test
    @DisplayName("7. Non-admin (MEMBER) cannot delete category (403 Forbidden)")
    void memberCannotDeleteCategory() throws Exception {
        Category cat = categoryRepository.save(Category.builder()
                .name("Protected " + UUID.randomUUID().toString().substring(0, 8))
                .type(CategoryType.EXPENSE)
                .isActive(true)
                .build());

        mockMvc.perform(delete("/api/v1/admin/categories/" + cat.getId())
                        .header("Authorization", "Bearer " + memberToken))
                .andExpect(status().isForbidden());

        assertThat(categoryRepository.findById(cat.getId())).isPresent();
    }

    @Test
    @DisplayName("8. ADMIN can bulk delete multiple unreferenced categories")
    void adminCanBulkDeleteCategories() throws Exception {
        Category cat1 = categoryRepository.save(Category.builder()
                .name("BulkDel1 " + UUID.randomUUID().toString().substring(0, 8))
                .type(CategoryType.EXPENSE)
                .isActive(true)
                .build());

        Category cat2 = categoryRepository.save(Category.builder()
                .name("BulkDel2 " + UUID.randomUUID().toString().substring(0, 8))
                .type(CategoryType.INCOME)
                .isActive(true)
                .build());

        com.cams.modules.category.dto.BulkDeleteCategoryRequest req =
                new com.cams.modules.category.dto.BulkDeleteCategoryRequest(List.of(cat1.getId(), cat2.getId()));

        mockMvc.perform(post("/api/v1/admin/categories/bulk-delete")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.deletedCount").value(2))
                .andExpect(jsonPath("$.data.failedCount").value(0));

        assertThat(categoryRepository.findById(cat1.getId())).isEmpty();
        assertThat(categoryRepository.findById(cat2.getId())).isEmpty();
    }

    @Test
    @DisplayName("9. MEMBER cannot bulk delete categories (403 Forbidden)")
    void memberCannotBulkDeleteCategories() throws Exception {
        Category cat = categoryRepository.save(Category.builder()
                .name("BulkProtected " + UUID.randomUUID().toString().substring(0, 8))
                .type(CategoryType.EXPENSE)
                .isActive(true)
                .build());

        com.cams.modules.category.dto.BulkDeleteCategoryRequest req =
                new com.cams.modules.category.dto.BulkDeleteCategoryRequest(List.of(cat.getId()));

        mockMvc.perform(post("/api/v1/admin/categories/bulk-delete")
                        .header("Authorization", "Bearer " + memberToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        assertThat(categoryRepository.findById(cat.getId())).isPresent();
    }
}
