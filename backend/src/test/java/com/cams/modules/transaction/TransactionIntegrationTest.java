package com.cams.modules.transaction;

import com.cams.modules.audit.model.AuditLog;
import com.cams.modules.audit.repository.AuditLogRepository;
import com.cams.modules.category.model.Category;
import com.cams.modules.category.model.CategoryType;
import com.cams.modules.category.repository.CategoryRepository;
import com.cams.modules.paymentmode.model.PaymentMode;
import com.cams.modules.paymentmode.repository.PaymentModeRepository;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.transaction.dto.ArchiveTransactionRequest;
import com.cams.modules.transaction.dto.CreateTransactionRequest;
import com.cams.modules.transaction.dto.UpdateTransactionRequest;
import com.cams.modules.transaction.model.InvoiceStatus;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
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
class TransactionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    @Test
    @DisplayName("1. ADMIN creates IN transaction")
    void adminCreatesInTransaction() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .transactionType(TransactionType.IN)
                .amount(new BigDecimal("50000.00"))
                .payerFrom("External Corporate Sponsor")
                .recipientTo("Club Main Account")
                .categoryId(incomeCategory.getId())
                .paymentMode("UPI")
                .referenceNumber("UPI-IN-123456")
                .comments("Annual club title sponsorship")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.transactionNumber", startsWith("TXN-")))
                .andExpect(jsonPath("$.data.transactionType").value("IN"))
                .andExpect(jsonPath("$.data.amount").value(50000.00))
                .andExpect(jsonPath("$.data.createdBy.id").value(adminUser.getId().toString()));
    }

    @Test
    @DisplayName("2. ADMIN creates OUT transaction")
    void adminCreatesOutTransaction() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .transactionType(TransactionType.OUT)
                .amount(new BigDecimal("3500.00"))
                .payerFrom("Club Treasurer")
                .recipientTo("Sports Emporium")
                .categoryId(expenseCategory.getId())
                .paymentMode("UPI")
                .referenceNumber("UPI-OUT-999")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.transactionType").value("OUT"))
                .andExpect(jsonPath("$.data.amount").value(3500.00));
    }

    @Test
    @DisplayName("3. ACCOUNTANT creates IN transaction")
    void accountantCreatesInTransaction() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .transactionType(TransactionType.IN)
                .amount(new BigDecimal("12000.00"))
                .payerFrom("Tournament Registrations")
                .recipientTo("Club Account")
                .categoryId(incomeCategory.getId())
                .paymentMode("CASH")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + accountantToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.transactionType").value("IN"))
                .andExpect(jsonPath("$.data.amount").value(12000.00));
    }

    @Test
    @DisplayName("4. ACCOUNTANT creates OUT transaction")
    void accountantCreatesOutTransaction() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .transactionType(TransactionType.OUT)
                .amount(new BigDecimal("1500.00"))
                .payerFrom("Club Cash Box")
                .recipientTo("Local Printing Press")
                .categoryId(expenseCategory.getId())
                .paymentMode("CASH")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + accountantToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.transactionType").value("OUT"));
    }

    @Test
    @DisplayName("5. MEMBER creates OUT transaction")
    void memberCreatesOutTransaction() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .transactionType(TransactionType.OUT)
                .amount(new BigDecimal("450.00"))
                .payerFrom("Member One")
                .recipientTo("First Aid Pharmacy")
                .categoryId(expenseCategory.getId())
                .paymentMode("UPI")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + member1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.transactionType").value("OUT"))
                .andExpect(jsonPath("$.data.createdBy.id").value(member1.getId().toString()));
    }

    @Test
    @DisplayName("6. MEMBER attempts IN transaction - rejected")
    void memberAttemptsInTransactionRejected() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .transactionType(TransactionType.IN)
                .amount(new BigDecimal("5000.00"))
                .payerFrom("Someone")
                .recipientTo("Club")
                .categoryId(incomeCategory.getId())
                .paymentMode("UPI")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + member1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message", containsString("Members are only permitted to record OUT")));
    }

    @Test
    @DisplayName("7. MEMBER cannot set another created_by (tamper resistance)")
    void memberCannotSetAnotherCreatedBy() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .amount(new BigDecimal("800.00"))
                .payerFrom("Member One")
                .recipientTo("Refreshment Stall")
                .categoryId(expenseCategory.getId())
                .paymentMode("UPI")
                .createdBy(adminUser.getId()) // Malicious attempt to spoof admin
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + member1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                // Server must strictly bind to authenticated member1, ignoring client-supplied createdBy
                .andExpect(jsonPath("$.data.createdBy.id").value(member1.getId().toString()))
                .andExpect(jsonPath("$.data.createdBy.id").value(not(adminUser.getId().toString())));
    }

    @Test
    @DisplayName("8 & 9. IDOR Defense: MEMBER can read own transaction, but CANNOT read another member's transaction")
    void idorProtectionOnRead() throws Exception {
        // Create transaction by member1
        Transaction txn1 = transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-" + transactionRepository.getNextTransactionSequence())
                .transactionDate(LocalDate.now())
                .payerFrom("Member One")
                .recipientTo("Store")
                .amount(new BigDecimal("999.00"))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCategory)
                .invoiceStatus(InvoiceStatus.AVAILABLE)
                .status(TransactionStatus.COMPLETED)
                .createdBy(member1)
                .build());

        // Member1 reads own transaction -> 200 OK
        mockMvc.perform(get("/api/v1/transactions/" + txn1.getId())
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(txn1.getId().toString()));

        // Member2 attempts to read member1's transaction -> 404 NOT FOUND (IDOR defense)
        mockMvc.perform(get("/api/v1/transactions/" + txn1.getId())
                        .header("Authorization", "Bearer " + member2Token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("10 & 11. MEMBER can update own transaction, but CANNOT update another member's transaction")
    void memberUpdateOwnAndCannotUpdateAnother() throws Exception {
        // Create transaction by member1
        Transaction txn1 = transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-" + transactionRepository.getNextTransactionSequence())
                .transactionDate(LocalDate.now())
                .payerFrom("Member One")
                .recipientTo("Hardware Store")
                .amount(new BigDecimal("1200.00"))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCategory)
                .invoiceStatus(InvoiceStatus.AVAILABLE)
                .status(TransactionStatus.COMPLETED)
                .createdBy(member1)
                .build());

        UpdateTransactionRequest updateReq = UpdateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .payerFrom("Member One Updated")
                .recipientTo("Hardware Store Updated")
                .amount(new BigDecimal("1350.00"))
                .categoryId(expenseCategory.getId())
                .paymentMode("UPI")
                .build();

        // Member2 attempts to update member1's transaction -> 404 NOT FOUND
        mockMvc.perform(put("/api/v1/transactions/" + txn1.getId())
                        .header("Authorization", "Bearer " + member2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isNotFound());

        // Member1 updates own transaction -> 200 OK
        mockMvc.perform(put("/api/v1/transactions/" + txn1.getId())
                        .header("Authorization", "Bearer " + member1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.amount").value(1350.00))
                .andExpect(jsonPath("$.data.payerFrom").value("Member One Updated"));
    }

    @Test
    @DisplayName("12 & 13. ADMIN can archive transaction with reason; ACCOUNTANT cannot archive")
    void archivePermissionsCheck() throws Exception {
        Transaction txn = transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-" + transactionRepository.getNextTransactionSequence())
                .transactionDate(LocalDate.now())
                .payerFrom("Payer")
                .recipientTo("Recipient")
                .amount(new BigDecimal("500.00"))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCategory)
                .status(TransactionStatus.COMPLETED)
                .createdBy(adminUser)
                .build());

        ArchiveTransactionRequest archiveReq = ArchiveTransactionRequest.builder()
                .reason("Duplicate entry entered by mistake")
                .build();

        // Accountant attempts archive -> 403 FORBIDDEN
        mockMvc.perform(delete("/api/v1/transactions/" + txn.getId())
                        .header("Authorization", "Bearer " + accountantToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(archiveReq)))
                .andExpect(status().isForbidden());

        // Admin archives -> 200 OK
        mockMvc.perform(delete("/api/v1/transactions/" + txn.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(archiveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ARCHIVED"));

        // Verify audit log captured archival reason
        List<AuditLog> audits = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("TRANSACTION", txn.getId());
        assertThat(audits).isNotEmpty();
        assertThat(audits.getFirst().getAction()).isEqualTo("ARCHIVE");
        assertThat(audits.getFirst().getChangeSummary()).contains("Duplicate entry entered by mistake");
    }

    @Test
    @DisplayName("14. Archived transaction cannot be modified normally")
    void archivedTransactionCannotBeModified() throws Exception {
        Transaction txn = transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-" + transactionRepository.getNextTransactionSequence())
                .transactionDate(LocalDate.now())
                .payerFrom("Payer")
                .recipientTo("Recipient")
                .amount(new BigDecimal("500.00"))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCategory)
                .status(TransactionStatus.ARCHIVED)
                .createdBy(adminUser)
                .build());

        UpdateTransactionRequest updateReq = UpdateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .payerFrom("Payer Changed")
                .recipientTo("Recipient")
                .amount(new BigDecimal("600.00"))
                .categoryId(expenseCategory.getId())
                .paymentMode("UPI")
                .build();

        mockMvc.perform(put("/api/v1/transactions/" + txn.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("Archived transactions cannot be modified")));
    }

    @Test
    @DisplayName("15. Invalid amount <= 0 is rejected")
    void invalidAmountRejected() throws Exception {
        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .amount(new BigDecimal("0.00"))
                .payerFrom("Payer")
                .recipientTo("Recipient")
                .categoryId(expenseCategory.getId())
                .paymentMode("UPI")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("16. Inactive payment mode is rejected")
    void inactivePaymentModeRejected() throws Exception {
        String code = "INACT_" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        paymentModeRepository.save(PaymentMode.builder()
                .code(code)
                .name("Inactive Mode")
                .isActive(false)
                .build());

        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .amount(new BigDecimal("100.00"))
                .payerFrom("Payer")
                .recipientTo("Recipient")
                .categoryId(expenseCategory.getId())
                .paymentMode(code)
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("inactive")));
    }

    @Test
    @DisplayName("17. Inactive category is rejected")
    void inactiveCategoryRejected() throws Exception {
        Category inactiveCat = categoryRepository.save(Category.builder()
                .name("Legacy Fund " + UUID.randomUUID().toString().substring(0, 6))
                .type(CategoryType.EXPENSE)
                .isActive(false)
                .build());

        CreateTransactionRequest request = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .amount(new BigDecimal("100.00"))
                .payerFrom("Payer")
                .recipientTo("Recipient")
                .categoryId(inactiveCat.getId())
                .paymentMode("UPI")
                .build();

        mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("inactive")));
    }

    @Test
    @DisplayName("18. Server-side sequence generates human-readable numbers starting from 1001+")
    void transactionSequenceGeneratedServerSide() throws Exception {
        CreateTransactionRequest req1 = CreateTransactionRequest.builder()
                .transactionDate(LocalDate.now())
                .amount(new BigDecimal("100.00"))
                .payerFrom("Payer")
                .recipientTo("Recipient")
                .categoryId(expenseCategory.getId())
                .paymentMode("UPI")
                .build();

        MvcResult res1 = mockMvc.perform(post("/api/v1/transactions")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1)))
                .andExpect(status().isCreated())
                .andReturn();

        String txnNum1 = objectMapper.readTree(res1.getResponse().getContentAsString()).at("/data/transactionNumber").asText();
        assertThat(txnNum1).matches("TXN-\\d+");
        int num1 = Integer.parseInt(txnNum1.replace("TXN-", ""));
        assertThat(num1).isGreaterThanOrEqualTo(1001);
    }

    @Test
    @DisplayName("19. Parameterized server-side pagination & filtering")
    void paginationAndFilteringWorks() throws Exception {
        mockMvc.perform(get("/api/v1/transactions?page=0&size=10&type=OUT")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(10))
                .andExpect(jsonPath("$.data.totalElements").isNumber());
    }

    @Test
    @DisplayName("20. MEMBER listing automatically scoped to own transactions only")
    void memberListingScopedServerSide() throws Exception {
        // Create 1 txn for member1, 1 txn for member2
        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-" + transactionRepository.getNextTransactionSequence())
                .transactionDate(LocalDate.now())
                .payerFrom("Member 1")
                .recipientTo("Store A")
                .amount(new BigDecimal("50.00"))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCategory)
                .createdBy(member1)
                .build());

        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-" + transactionRepository.getNextTransactionSequence())
                .transactionDate(LocalDate.now())
                .payerFrom("Member 2")
                .recipientTo("Store B")
                .amount(new BigDecimal("60.00"))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCategory)
                .createdBy(member2)
                .build());

        // When member1 queries /api/v1/transactions, only transactions created by member1 are returned
        mockMvc.perform(get("/api/v1/transactions")
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].createdBy.id", everyItem(equalTo(member1.getId().toString()))));
    }
}
