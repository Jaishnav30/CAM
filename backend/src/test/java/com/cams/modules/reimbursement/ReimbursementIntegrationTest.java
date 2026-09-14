package com.cams.modules.reimbursement;

import com.cams.modules.audit.model.AuditLog;
import com.cams.modules.audit.repository.AuditLogRepository;
import com.cams.modules.category.model.Category;
import com.cams.modules.category.model.CategoryType;
import com.cams.modules.category.repository.CategoryRepository;
import com.cams.modules.document.model.Document;
import com.cams.modules.document.model.DocumentType;
import com.cams.modules.document.repository.DocumentRepository;
import com.cams.modules.paymentmode.model.PaymentMode;
import com.cams.modules.paymentmode.repository.PaymentModeRepository;
import com.cams.modules.reimbursement.dto.RejectReimbursementRequest;
import com.cams.modules.reimbursement.dto.SubmitReimbursementRequest;
import com.cams.modules.reimbursement.model.Reimbursement;
import com.cams.modules.reimbursement.model.ReimbursementStatus;
import com.cams.modules.reimbursement.repository.ReimbursementRepository;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.transaction.dto.CreateTransactionRequest;
import com.cams.modules.transaction.dto.UpdateTransactionRequest;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.transaction.model.TransactionStatus;
import com.cams.modules.transaction.model.TransactionType;
import com.cams.modules.transaction.repository.TransactionRepository;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
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
class ReimbursementIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ReimbursementRepository reimbursementRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PaymentModeRepository paymentModeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User adminUser;
    private User accountantUser;
    private User member1;
    private User member2;

    private String adminToken;
    private String accountantToken;
    private String member1Token;
    private String member2Token;

    private Category expenseCategory;
    private Category incomeCategory;
    private PaymentMode upiMode;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.findByEmailIgnoreCase("admin@cams.local").orElseThrow();
        adminToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(adminUser));

        accountantUser = userRepository.findByEmailIgnoreCase("accountant@cams.local").orElseGet(() -> {
            Role role = roleRepository.findByName("ACCOUNTANT").orElseThrow();
            User u = User.builder()
                    .email("accountant@cams.local")
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .fullName("Head Accountant")
                    .roles(Set.of(role))
                    .isActive(true)
                    .build();
            return userRepository.save(u);
        });
        accountantToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(accountantUser));

        member1 = userRepository.findByEmailIgnoreCase("member1@cams.local").orElseGet(() -> {
            Role role = roleRepository.findByName("MEMBER").orElseThrow();
            User u = User.builder()
                    .email("member1@cams.local")
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .fullName("Member One")
                    .roles(Set.of(role))
                    .isActive(true)
                    .build();
            return userRepository.save(u);
        });
        member1Token = jwtTokenProvider.generateAccessToken(UserPrincipal.create(member1));

        member2 = userRepository.findByEmailIgnoreCase("member2@cams.local").orElseGet(() -> {
            Role role = roleRepository.findByName("MEMBER").orElseThrow();
            User u = User.builder()
                    .email("member2@cams.local")
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .fullName("Member Two")
                    .roles(Set.of(role))
                    .isActive(true)
                    .build();
            return userRepository.save(u);
        });
        member2Token = jwtTokenProvider.generateAccessToken(UserPrincipal.create(member2));



        expenseCategory = categoryRepository.findByNameIgnoreCase("Deco")
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name("Deco")
                        .type(CategoryType.EXPENSE)
                        .isActive(true)
                        .build()));

        incomeCategory = categoryRepository.findByNameIgnoreCase("Sponsorship")
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name("Sponsorship")
                        .type(CategoryType.INCOME)
                        .isActive(true)
                        .build()));

        upiMode = paymentModeRepository.findByCodeIgnoreCase("UPI")
                .orElseGet(() -> paymentModeRepository.save(PaymentMode.builder()
                        .code("UPI")
                        .name("UPI / QR")
                        .isActive(true)
                        .build()));
    }

    private Transaction createTestTransaction(User owner, TransactionType type, TransactionStatus status) {
        return transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .transactionDate(LocalDate.now())
                .transactionType(type)
                .amount(new BigDecimal("2500.00"))
                .payerFrom(owner.getFullName())
                .recipientTo("Sports Gear Vendor")
                .category(type == TransactionType.IN ? incomeCategory : expenseCategory)
                .paymentMode(upiMode)
                .status(status)
                .createdBy(owner)
                .build());
    }

    @Test
    @DisplayName("1. Member creates OUT transaction without reimbursement")
    void test01_memberCreatesOutTransactionWithoutReimbursement() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .payerFrom(member1.getFullName())
                .recipientTo("Banner Vendor")
                .amount(new BigDecimal("1500.00"))
                .paymentMode("UPI")
                .categoryId(expenseCategory.getId())
                .comments("Regular personal expense")
                .requestReimbursement(false)
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        String txnId = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asText();
        assertThat(reimbursementRepository.existsByTransactionId(UUID.fromString(txnId))).isFalse();
    }

    @Test
    @DisplayName("2. Member creates OUT transaction with reimbursement request")
    void test02_memberCreatesOutTransactionWithReimbursement() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .payerFrom(member1.getFullName())
                .recipientTo("Catering Vendor")
                .amount(new BigDecimal("3500.00"))
                .paymentMode("UPI")
                .categoryId(expenseCategory.getId())
                .comments("Refreshments for tournament")
                .requestReimbursement(true)
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn();

        String txnId = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asText();
        Reimbursement claim = reimbursementRepository.findByTransactionId(UUID.fromString(txnId)).orElseThrow();
        assertThat(claim.getStatus()).isEqualTo(ReimbursementStatus.SUBMITTED);
        assertThat(claim.getClaimNumber()).startsWith("CLM-");
        assertThat(claim.getClaimant().getId()).isEqualTo(member1.getId());
    }

    @Test
    @DisplayName("3. Transaction + reimbursement created atomically")
    void test03_transactionAndReimbursementCreatedAtomically() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .payerFrom(member1.getFullName())
                .recipientTo("Trophy Shop")
                .amount(new BigDecimal("4200.00"))
                .paymentMode("UPI")
                .categoryId(expenseCategory.getId())
                .requestReimbursement(true)
                .build();

        MvcResult result = mockMvc.perform(post("/api/v1/transactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String txnId = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asText();
        Transaction txn = transactionRepository.findById(UUID.fromString(txnId)).orElseThrow();
        Reimbursement claim = reimbursementRepository.findByTransactionId(txn.getId()).orElseThrow();

        assertThat(txn).isNotNull();
        assertThat(claim).isNotNull();
        assertThat(claim.getTransaction().getId()).isEqualTo(txn.getId());
    }

    @Test
    @DisplayName("4. Transaction remains without reimbursement when not requested")
    void test04_transactionRemainsWithoutReimbursementWhenNotRequested() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        assertThat(reimbursementRepository.existsByTransactionId(txn.getId())).isFalse();
    }

    @Test
    @DisplayName("5. Duplicate reimbursement is rejected (409 Conflict)")
    void test05_duplicateReimbursementIsRejected() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);

        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated());

        // Duplicate submission
        mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("6. IN transaction cannot create reimbursement (400 Bad Request)")
    void test06_inTransactionCannotCreateReimbursement() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionType.IN, TransactionStatus.COMPLETED);

        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("7. Archived transaction cannot create reimbursement (409 Conflict)")
    void test07_archivedTransactionCannotCreateReimbursement() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionType.OUT, TransactionStatus.ARCHIVED);

        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("8. Member cannot create reimbursement for another member's transaction (404 Not Found)")
    void test08_memberCannotCreateReimbursementForOtherMemberTransaction() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);

        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member2Token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("9. SUBMITTED -> APPROVED works")
    void test09_submittedToApprovedWorks() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));

        Reimbursement claim = reimbursementRepository.findById(UUID.fromString(claimId)).orElseThrow();
        assertThat(claim.getStatus()).isEqualTo(ReimbursementStatus.APPROVED);
    }

    @Test
    @DisplayName("10. SUBMITTED -> REJECTED works")
    void test10_submittedToRejectedWorks() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        RejectReimbursementRequest rejectReq = new RejectReimbursementRequest("Missing formal GST bill");
        mockMvc.perform(post("/api/v1/reimbursements/{id}/reject", claimId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectReq))
                        .header("Authorization", "Bearer " + accountantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.rejectionReason").value("Missing formal GST bill"));

        Reimbursement claim = reimbursementRepository.findById(UUID.fromString(claimId)).orElseThrow();
        assertThat(claim.getStatus()).isEqualTo(ReimbursementStatus.REJECTED);
        assertThat(claim.getRejectionReason()).isEqualTo("Missing formal GST bill");
    }

    @Test
    @DisplayName("11. Rejection requires reason (400 Bad Request)")
    void test11_rejectionRequiresReason() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        // Empty reason
        RejectReimbursementRequest blankReq = new RejectReimbursementRequest("   ");
        mockMvc.perform(post("/api/v1/reimbursements/{id}/reject", claimId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(blankReq))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("12. REJECTED -> SUBMITTED works")
    void test12_rejectedToSubmittedWorks() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(post("/api/v1/reimbursements/{id}/reject", claimId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RejectReimbursementRequest("Invalid receipt")))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Resubmit by member1
        mockMvc.perform(post("/api/v1/reimbursements/{id}/resubmit", claimId)
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.data.rejectionReason").value(nullValue()));

        Reimbursement claim = reimbursementRepository.findById(UUID.fromString(claimId)).orElseThrow();
        assertThat(claim.getStatus()).isEqualTo(ReimbursementStatus.SUBMITTED);
        assertThat(claim.getRejectionReason()).isNull();
    }

    @Test
    @DisplayName("13. Rejection reason cleared on resubmission")
    void test13_rejectionReasonClearedOnResubmission() throws Exception {
        test12_rejectedToSubmittedWorks();
    }

    @Test
    @DisplayName("14. APPROVED -> REIMBURSED works")
    void test14_approvedToReimbursedWorks() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/reimbursements/{id}/mark-reimbursed", claimId)
                        .header("Authorization", "Bearer " + accountantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REIMBURSED"));

        Reimbursement claim = reimbursementRepository.findById(UUID.fromString(claimId)).orElseThrow();
        assertThat(claim.getStatus()).isEqualTo(ReimbursementStatus.REIMBURSED);
    }

    @Test
    @DisplayName("15. Invalid status transitions are rejected (409 Conflict)")
    void test15_invalidStatusTransitionsAreRejected() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        // SUBMITTED -> REIMBURSED directly is invalid
        mockMvc.perform(post("/api/v1/reimbursements/{id}/mark-reimbursed", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict());

        // SUBMITTED -> resubmit directly is invalid
        mockMvc.perform(post("/api/v1/reimbursements/{id}/resubmit", claimId)
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("16. APPROVED claim cannot be edited by member (409 Conflict)")
    void test16_approvedClaimCannotBeEditedByMember() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();
        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Member attempts to update underlying transaction
        UpdateTransactionRequest updateReq = UpdateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .payerFrom(member1.getFullName())
                .recipientTo("Modified Vendor")
                .amount(new BigDecimal("9999.00"))
                .paymentMode("UPI")
                .categoryId(expenseCategory.getId())
                .build();

        mockMvc.perform(put("/api/v1/transactions/{id}", txn.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("locked")));
    }

    @Test
    @DisplayName("17. REIMBURSED claim cannot be edited by member (409 Conflict)")
    void test17_reimbursedClaimCannotBeEditedByMember() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();
        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/reimbursements/{id}/mark-reimbursed", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        UpdateTransactionRequest updateReq = UpdateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .payerFrom(member1.getFullName())
                .recipientTo("Modified Vendor")
                .amount(new BigDecimal("9999.00"))
                .paymentMode("UPI")
                .categoryId(expenseCategory.getId())
                .build();

        mockMvc.perform(put("/api/v1/transactions/{id}", txn.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("locked")));
    }

    @Test
    @DisplayName("18. REJECTED claim can be edited by member")
    void test18_rejectedClaimCanBeEditedByMember() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();
        mockMvc.perform(post("/api/v1/reimbursements/{id}/reject", claimId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RejectReimbursementRequest("Needs fix")))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Member edits rejected transaction
        UpdateTransactionRequest updateReq = UpdateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .payerFrom(member1.getFullName())
                .recipientTo("Correct Vendor")
                .amount(new BigDecimal("2800.00"))
                .paymentMode("UPI")
                .categoryId(expenseCategory.getId())
                .build();

        mockMvc.perform(put("/api/v1/transactions/{id}", txn.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.recipientTo").value("Correct Vendor"))
                .andExpect(jsonPath("$.data.amount").value(2800.0));
    }

    @Test
    @DisplayName("19. REJECTED claim can be resubmitted")
    void test19_rejectedClaimCanBeResubmitted() throws Exception {
        test12_rejectedToSubmittedWorks();
    }

    @Test
    @DisplayName("20. MEMBER cannot access another member's reimbursement (404 Not Found)")
    void test20_memberCannotAccessOtherMemberReimbursement() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        // Member 2 attempts to fetch Member 1's claim -> 404
        mockMvc.perform(get("/api/v1/reimbursements/{id}", claimId)
                        .header("Authorization", "Bearer " + member2Token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("21. ADMIN can approve")
    void test21_adminCanApprove() throws Exception {
        test09_submittedToApprovedWorks();
    }

    @Test
    @DisplayName("22. ACCOUNTANT can approve")
    void test22_accountantCanApprove() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + accountantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test
    @DisplayName("23. MEMBER cannot approve (403 Forbidden)")
    void test23_memberCannotApprove() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("24. ADMIN and ACCOUNTANT can reject")
    void test24_adminAndAccountantCanReject() throws Exception {
        test10_submittedToRejectedWorks();
    }

    @Test
    @DisplayName("25. MEMBER cannot reject (403 Forbidden)")
    void test25_memberCannotReject() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();

        // Member read own is allowed (200 OK)
        mockMvc.perform(get("/api/v1/reimbursements/{id}", claimId)
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isOk());

        // Member reject is forbidden (403 Forbidden)
        mockMvc.perform(post("/api/v1/reimbursements/{id}/reject", claimId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RejectReimbursementRequest("Member rejection")))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("26. Claim number generated server-side (CLM-1001+)")
    void test26_claimNumberGeneratedServerSide() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimNumber = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("claimNumber").asText();
        assertThat(claimNumber).matches("CLM-\\d{4,}");
    }

    @Test
    @DisplayName("27. No second transaction is created when marked reimbursed")
    void test27_noSecondTransactionCreatedWhenMarkedReimbursed() throws Exception {
        long txnCountBefore = transactionRepository.count();

        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();
        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/reimbursements/{id}/mark-reimbursed", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        long txnCountAfter = transactionRepository.count();
        // Exactly 1 new transaction created (the test transaction), none on payout
        assertThat(txnCountAfter).isEqualTo(txnCountBefore + 1);
    }

    @Test
    @DisplayName("28. Audit records created for reimbursement lifecycle changes")
    void test28_auditRecordsCreatedForReimbursementLifecycle() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();
        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        List<AuditLog> audits = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("REIMBURSEMENT", UUID.fromString(claimId));
        assertThat(audits).hasSizeGreaterThanOrEqualTo(2);
        assertThat(audits.stream().anyMatch(a -> "CREATE".equals(a.getAction()))).isTrue();
        assertThat(audits.stream().anyMatch(a -> "STATUS_CHANGE".equals(a.getAction()))).isTrue();
    }

    @Test
    @DisplayName("29. Claimant is server-controlled")
    void test29_claimantIsServerControlled() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimantEmail = objectMapper.readTree(submitResult.getResponse().getContentAsString())
                .path("data").path("claimant").path("email").asText();
        assertThat(claimantEmail).isEqualTo("member1@cams.local");
    }

    @Test
    @DisplayName("30. Document attachment locked when claim is APPROVED (409 Conflict)")
    void test30_documentAttachmentLockedWhenClaimApproved() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionType.OUT, TransactionStatus.COMPLETED);
        SubmitReimbursementRequest req = new SubmitReimbursementRequest(txn.getId());
        MvcResult submitResult = mockMvc.perform(post("/api/v1/reimbursements")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String claimId = objectMapper.readTree(submitResult.getResponse().getContentAsString()).path("data").path("id").asText();
        mockMvc.perform(post("/api/v1/reimbursements/{id}/approve", claimId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Try to attach document to the approved transaction
        byte[] pdfBytes = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 2\n0000000000 65535 f\ntrailer<</Size 2/Root 1 0 R>>\n%%EOF".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "bill.pdf", "application/pdf", pdfBytes);

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(containsString("locked")));
    }
}
