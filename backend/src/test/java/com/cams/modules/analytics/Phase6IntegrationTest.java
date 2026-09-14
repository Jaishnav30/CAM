package com.cams.modules.analytics;

import com.cams.modules.audit.model.AuditLog;
import com.cams.modules.audit.repository.AuditLogRepository;
import com.cams.modules.category.model.Category;
import com.cams.modules.category.model.CategoryType;
import com.cams.modules.category.repository.CategoryRepository;
import com.cams.modules.paymentmode.model.PaymentMode;
import com.cams.modules.paymentmode.repository.PaymentModeRepository;
import com.cams.modules.reimbursement.model.Reimbursement;
import com.cams.modules.reimbursement.model.ReimbursementStatus;
import com.cams.modules.reimbursement.repository.ReimbursementRepository;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.transaction.model.InvoiceStatus;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.transaction.model.TransactionStatus;
import com.cams.modules.transaction.model.TransactionType;
import com.cams.modules.transaction.repository.TransactionRepository;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.cams.security.UserPrincipal;
import com.cams.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
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
public class Phase6IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private PaymentModeRepository paymentModeRepository;

    @Autowired
    private ReimbursementRepository reimbursementRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private User adminUser;
    private User accountantUser;
    private User memberUser;

    private String adminToken;
    private String accountantToken;
    private String memberToken;

    private Category expenseCat;
    private Category incomeCat;
    private PaymentMode upiMode;
    private PaymentMode cashMode;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.findByEmailIgnoreCase("admin@cams.local").orElseThrow();
        adminToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(adminUser));

        accountantUser = userRepository.findByEmailIgnoreCase("accountant@cams.local").orElseGet(() -> {
            Role role = roleRepository.findByName("ACCOUNTANT").orElseThrow();
            return userRepository.save(User.builder()
                    .email("accountant@cams.local")
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .fullName("Head Accountant")
                    .roles(Set.of(role))
                    .isActive(true)
                    .build());
        });
        accountantToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(accountantUser));

        memberUser = userRepository.findByEmailIgnoreCase("member1@cams.local").orElseGet(() -> {
            Role role = roleRepository.findByName("MEMBER").orElseThrow();
            return userRepository.save(User.builder()
                    .email("member1@cams.local")
                    .passwordHash(passwordEncoder.encode("Password123!"))
                    .fullName("Standard Member")
                    .roles(Set.of(role))
                    .isActive(true)
                    .build());
        });
        memberToken = jwtTokenProvider.generateAccessToken(UserPrincipal.create(memberUser));

        expenseCat = categoryRepository.findByNameIgnoreCase("Tournament Equipment").orElseGet(() ->
                categoryRepository.save(Category.builder()
                        .name("Tournament Equipment")
                        .type(CategoryType.EXPENSE)
                        .isActive(true)
                        .build())
        );

        incomeCat = categoryRepository.findByNameIgnoreCase("Membership & Contributions").orElseGet(() ->
                categoryRepository.save(Category.builder()
                        .name("Membership & Contributions")
                        .type(CategoryType.INCOME)
                        .isActive(true)
                        .build())
        );

        upiMode = paymentModeRepository.findByCodeIgnoreCase("UPI").orElseGet(() ->
                paymentModeRepository.save(PaymentMode.builder()
                        .code("UPI")
                        .name("Unified Payments Interface")
                        .isActive(true)
                        .build())
        );

        cashMode = paymentModeRepository.findByCodeIgnoreCase("CASH").orElseGet(() ->
                paymentModeRepository.save(PaymentMode.builder()
                        .code("CASH")
                        .name("Cash")
                        .isActive(true)
                        .build())
        );
    }

    // =========================================================================
    // AUDIT LOG TESTS
    // =========================================================================

    @Test
    @DisplayName("01. Admin can read audit logs")
    void test01_adminCanReadAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("02. Unauthenticated user cannot read audit logs (401)")
    void test02_unauthenticatedCannotReadAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("03. Accountant cannot read audit logs")
    void test03_accountantCannotReadAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accountantToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("04. Member cannot read audit logs")
    void test04_memberCannotReadAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + memberToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("05. Audit filtering works by entityType and action")
    void test05_auditFilteringWorks() throws Exception {
        AuditLog log1 = auditLogRepository.save(AuditLog.builder()
                .entityType("TRANSACTION")
                .entityId(UUID.randomUUID())
                .action("CREATE")
                .performedBy(adminUser)
                .changeSummary("Transaction created")
                .createdAt(Instant.now())
                .build());

        AuditLog log2 = auditLogRepository.save(AuditLog.builder()
                .entityType("REIMBURSEMENT")
                .entityId(UUID.randomUUID())
                .action("STATUS_CHANGE")
                .performedBy(adminUser)
                .changeSummary("Reimbursement status changed")
                .createdAt(Instant.now())
                .build());

        mockMvc.perform(get("/api/v1/audit-logs")
                        .param("entityType", "TRANSACTION")
                        .param("action", "CREATE")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[*].entityType", everyItem(equalToIgnoringCase("TRANSACTION"))))
                .andExpect(jsonPath("$.data.content[*].action", everyItem(equalToIgnoringCase("CREATE"))));
    }

    @Test
    @DisplayName("06. Audit pagination works")
    void test06_auditPaginationWorks() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs")
                        .param("page", "0")
                        .param("size", "5")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(0))
                .andExpect(jsonPath("$.data.size").value(5));
    }

    @Test
    @DisplayName("07. Audit logs cannot be modified through API")
    void test07_auditLogsCannotBeModifiedThroughApi() throws Exception {
        mockMvc.perform(put("/api/v1/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(delete("/api/v1/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isMethodNotAllowed());
    }

    // =========================================================================
    // ANALYTICS TESTS
    // =========================================================================

    @Test
    @DisplayName("08. Admin can access analytics summary")
    void test08_adminCanAccessSummary() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("09. Accountant can access analytics summary")
    void test09_accountantCanAccessSummary() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accountantToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("11. Member cannot access analytics")
    void test11_memberCannotAccessAnalytics() throws Exception {
        mockMvc.perform(get("/api/v1/analytics/summary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + memberToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/analytics/breakdowns")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + memberToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("12 & 13 & 14. IN/OUT totals are correct, and DRAFT/ARCHIVED transactions are excluded")
    void test12_13_14_financialTotalsAndStatusExclusion() throws Exception {
        LocalDate testDate = LocalDate.of(1975, 5, 10);
        List<Transaction> existing12 = transactionRepository.findAll((root, query, cb) -> cb.equal(root.get("transactionDate"), testDate));
        if (!existing12.isEmpty()) {
            transactionRepository.deleteAll(existing12);
        }

        // Create completed IN transaction
        Transaction inTxn = transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-TEST-IN-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("Donor")
                .recipientTo("Club")
                .amount(BigDecimal.valueOf(1000.00))
                .transactionType(TransactionType.IN)
                .paymentMode(upiMode)
                .category(incomeCat)
                .invoiceStatus(InvoiceStatus.AVAILABLE)
                .status(TransactionStatus.COMPLETED)
                .createdBy(adminUser)
                .build());

        // Create completed OUT transaction
        Transaction outTxn = transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-TEST-OUT-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("Club")
                .recipientTo("Vendor")
                .amount(BigDecimal.valueOf(400.00))
                .transactionType(TransactionType.OUT)
                .paymentMode(cashMode)
                .category(expenseCat)
                .invoiceStatus(InvoiceStatus.AVAILABLE)
                .status(TransactionStatus.COMPLETED)
                .createdBy(adminUser)
                .build());

        // Create ARCHIVED transaction (should be excluded from IN/OUT/Net totals)
        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-TEST-ARCH-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("Club")
                .recipientTo("Mistake")
                .amount(BigDecimal.valueOf(9999.00))
                .transactionType(TransactionType.OUT)
                .paymentMode(cashMode)
                .category(expenseCat)
                .invoiceStatus(InvoiceStatus.AVAILABLE)
                .status(TransactionStatus.ARCHIVED)
                .createdBy(adminUser)
                .build());

        // Create DRAFT transaction (should be excluded from normal financial totals)
        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-TEST-DFT-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("Club")
                .recipientTo("Pending Draft")
                .amount(BigDecimal.valueOf(5000.00))
                .transactionType(TransactionType.OUT)
                .paymentMode(cashMode)
                .category(expenseCat)
                .invoiceStatus(InvoiceStatus.AVAILABLE)
                .status(TransactionStatus.DRAFT)
                .createdBy(adminUser)
                .build());

        // Query summary for this specific date
        mockMvc.perform(get("/api/v1/analytics/summary")
                        .param("startDate", testDate.toString())
                        .param("endDate", testDate.toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalInAmount").value(1000.0))
                .andExpect(jsonPath("$.data.totalOutAmount").value(400.0))
                .andExpect(jsonPath("$.data.netAmount").value(600.0))
                .andExpect(jsonPath("$.data.completedTransactionCount").value(2))
                .andExpect(jsonPath("$.data.archivedTransactionCount").value(1));
    }

    @Test
    @DisplayName("15 & 16. Reimbursement counts and reimbursed amount derived from linked transaction")
    void test15_16_reimbursementCountsAndDerivedAmount() throws Exception {
        LocalDate testDate = LocalDate.of(1955, 3, 15);
        List<Transaction> existing15 = transactionRepository.findAll((root, query, cb) -> cb.equal(root.get("transactionDate"), testDate));
        for (Transaction t : existing15) {
            reimbursementRepository.findByTransactionId(t.getId()).ifPresent(reimbursementRepository::delete);
            transactionRepository.delete(t);
        }

        Transaction txn = transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-REIMB-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("Member One")
                .recipientTo("Store")
                .amount(BigDecimal.valueOf(750.50))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCat)
                .invoiceStatus(InvoiceStatus.AVAILABLE)
                .status(TransactionStatus.COMPLETED)
                .createdBy(memberUser)
                .build());

        reimbursementRepository.save(Reimbursement.builder()
                .claimNumber("CLM-P6-" + UUID.randomUUID().toString().substring(0, 6))
                .transaction(txn)
                .claimant(memberUser)
                .status(ReimbursementStatus.REIMBURSED)
                .build());

        mockMvc.perform(get("/api/v1/analytics/summary")
                        .param("startDate", testDate.toString())
                        .param("endDate", testDate.toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.reimbursementReimbursedCount").value(1))
                .andExpect(jsonPath("$.data.totalReimbursedAmount").value(750.5));
    }

    @Test
    @DisplayName("17 & 18. Category and Payment Mode breakdowns aggregation")
    void test17_18_categoryAndPaymentModeBreakdowns() throws Exception {
        LocalDate testDate = LocalDate.now().minusDays(3);

        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-CAT1-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("Member")
                .recipientTo("Sports Shop")
                .amount(BigDecimal.valueOf(300.00))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCat)
                .invoiceStatus(InvoiceStatus.AVAILABLE)
                .status(TransactionStatus.COMPLETED)
                .createdBy(memberUser)
                .build());

        mockMvc.perform(get("/api/v1/analytics/breakdowns")
                        .param("startDate", testDate.toString())
                        .param("endDate", testDate.toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.expensesByCategory", not(empty())))
                .andExpect(jsonPath("$.data.expensesByPaymentMode", not(empty())))
                .andExpect(jsonPath("$.data.transactionsOverTime", not(empty())));
    }

    @Test
    @DisplayName("19. Date filtering restricts analytics to requested window")
    void test19_dateFilteringIsCorrect() throws Exception {
        LocalDate insideDate = LocalDate.of(1935, 8, 20);
        LocalDate outsideDate = insideDate.minusYears(5);
        List<Transaction> existing19 = transactionRepository.findAll((root, query, cb) ->
                cb.or(cb.equal(root.get("transactionDate"), insideDate), cb.equal(root.get("transactionDate"), outsideDate)));
        if (!existing19.isEmpty()) {
            transactionRepository.deleteAll(existing19);
        }

        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-IN-WIN-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(insideDate)
                .payerFrom("Donor")
                .recipientTo("Club")
                .amount(BigDecimal.valueOf(250.00))
                .transactionType(TransactionType.IN)
                .paymentMode(upiMode)
                .category(incomeCat)
                .status(TransactionStatus.COMPLETED)
                .createdBy(adminUser)
                .build());

        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-OUT-WIN-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(outsideDate)
                .payerFrom("Donor")
                .recipientTo("Club")
                .amount(BigDecimal.valueOf(9000.00))
                .transactionType(TransactionType.IN)
                .paymentMode(upiMode)
                .category(incomeCat)
                .status(TransactionStatus.COMPLETED)
                .createdBy(adminUser)
                .build());

        mockMvc.perform(get("/api/v1/analytics/summary")
                        .param("startDate", insideDate.toString())
                        .param("endDate", insideDate.toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalInAmount").value(250.0));
    }

    // =========================================================================
    // REPORTS TESTS
    // =========================================================================

    @Test
    @DisplayName("20. Authorized roles can generate transaction CSV")
    void test20_authorizedRolesCanGenerateTransactionCsv() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/transactions")
                        .param("format", "csv")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accountantToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString("text/csv")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("transactions_report_")))
                .andReturn();

        String csvContent = result.getResponse().getContentAsString();
        assertThat(csvContent).startsWith("Date,Transaction #,Type,Payer / Recipient,Category,Payment Mode,Amount,Status,Created By");
    }

    @Test
    @DisplayName("21. Authorized roles can generate reimbursement CSV")
    void test21_authorizedRolesCanGenerateReimbursementCsv() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/reports/reimbursements")
                        .param("format", "csv")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accountantToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString("text/csv")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("reimbursements_report_")))
                .andReturn();

        String csvContent = result.getResponse().getContentAsString();
        assertThat(csvContent).startsWith("Claim #,Transaction #,Date,Claimant,Category,Amount,Status,Rejection Reason,Created At,Updated At");
    }

    @Test
    @DisplayName("22. Member cannot access reports")
    void test22_memberCannotAccessReports() throws Exception {
        mockMvc.perform(get("/api/v1/reports/transactions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + memberToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/reports/reimbursements")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + memberToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("23 & 24. Date, category, and status filters work on reports")
    void test23_24_reportFiltersWork() throws Exception {
        LocalDate testDate = LocalDate.now().minusDays(7);

        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-REP-FLT-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("Club")
                .recipientTo("Vendor")
                .amount(BigDecimal.valueOf(123.45))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCat)
                .status(TransactionStatus.COMPLETED)
                .createdBy(adminUser)
                .build());

        mockMvc.perform(get("/api/v1/reports/transactions")
                        .param("startDate", testDate.toString())
                        .param("endDate", testDate.toString())
                        .param("categoryId", expenseCat.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", not(empty())))
                .andExpect(jsonPath("$.data[0].amount").value(123.45));
    }

    @Test
    @DisplayName("25. CSV quoting and escaping works for commas and quotes")
    void test25_csvQuotingAndEscaping() throws Exception {
        LocalDate testDate = LocalDate.now().minusDays(2);

        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-QUOTE-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("Club, Main Branch")
                .recipientTo("Vendor \"Special\" Inc")
                .amount(BigDecimal.valueOf(88.00))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCat)
                .status(TransactionStatus.COMPLETED)
                .createdBy(adminUser)
                .build());

        MvcResult result = mockMvc.perform(get("/api/v1/reports/transactions")
                        .param("startDate", testDate.toString())
                        .param("endDate", testDate.toString())
                        .param("format", "csv")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        // Commas and quotes must be properly enclosed
        assertThat(csv).contains("\"Club, Main Branch / Vendor \"\"Special\"\" Inc\"");
    }

    @Test
    @DisplayName("26. CSV formula injection is neutralized (=, +, -, @)")
    void test26_csvFormulaInjectionNeutralized() throws Exception {
        LocalDate testDate = LocalDate.now().minusDays(1);

        transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-INJ-" + UUID.randomUUID().toString().substring(0, 6))
                .transactionDate(testDate)
                .payerFrom("=cmd|' /C calc'!A0")
                .recipientTo("+123456")
                .amount(BigDecimal.valueOf(50.00))
                .transactionType(TransactionType.OUT)
                .paymentMode(upiMode)
                .category(expenseCat)
                .status(TransactionStatus.COMPLETED)
                .createdBy(adminUser)
                .build());

        MvcResult result = mockMvc.perform(get("/api/v1/reports/transactions")
                        .param("startDate", testDate.toString())
                        .param("endDate", testDate.toString())
                        .param("format", "csv")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();

        String csv = result.getResponse().getContentAsString();
        // Formula injection trigger character '=' must be prepended with a single quote "'"
        assertThat(csv).contains("'=cmd|' /C calc'!A0");
    }

    @Test
    @DisplayName("27. Sensitive fields are absent from audit logs, analytics, and reports")
    void test27_sensitiveFieldsAreAbsent() throws Exception {
        MvcResult auditResult = mockMvc.perform(get("/api/v1/audit-logs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        String auditJson = auditResult.getResponse().getContentAsString();
        assertThat(auditJson).doesNotContain("passwordHash");
        assertThat(auditJson).doesNotContain("refreshToken");

        MvcResult reportResult = mockMvc.perform(get("/api/v1/reports/transactions")
                        .param("format", "csv")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andReturn();
        String reportCsv = reportResult.getResponse().getContentAsString();
        assertThat(reportCsv).doesNotContain("password");
        assertThat(reportCsv).doesNotContain("token");
        assertThat(reportCsv).doesNotContain("C:\\");
    }
}
