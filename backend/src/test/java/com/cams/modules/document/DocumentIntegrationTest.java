package com.cams.modules.document;

import com.cams.config.StorageProperties;
import com.cams.modules.audit.model.AuditLog;
import com.cams.modules.audit.repository.AuditLogRepository;
import com.cams.modules.category.model.Category;
import com.cams.modules.category.model.CategoryType;
import com.cams.modules.category.repository.CategoryRepository;
import com.cams.modules.document.model.Document;
import com.cams.modules.document.model.DocumentType;
import com.cams.modules.document.repository.DocumentRepository;
import com.cams.modules.document.service.DocumentStorageService;
import com.cams.modules.paymentmode.model.PaymentMode;
import com.cams.modules.paymentmode.repository.PaymentModeRepository;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.security.admin.email=admin@cams.local",
        "app.security.admin.password=AdminTestPassword123!",
        "app.security.cookie.secure=false",
        "app.storage.upload-dir=./target/test-uploads"
})
class DocumentIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private DocumentRepository documentRepository;

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

    @Autowired
    private DocumentStorageService storageService;

    @Autowired
    private StorageProperties storageProperties;

    private User adminUser;
    private User accountantUser;
    private User member1;
    private User member2;

    private String adminToken;
    private String accountantToken;
    private String member1Token;
    private String member2Token;

    private Category expenseCategory;
    private PaymentMode upiMode;

    // Standard valid file payloads
    private static final byte[] VALID_PDF_BYTES = (
            "%PDF-1.4\n" +
            "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
            "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
            "3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n" +
            "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000102 00000 n\n" +
            "trailer<</Size 4/Root 1 0 R>>\nstartxref\n150\n%%EOF\n"
    ).getBytes(StandardCharsets.UTF_8);

    private static final byte[] VALID_PNG_BYTES = new byte[]{
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, (byte) 0xC4, (byte) 0x89,
            0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
            0x78, (byte) 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
            0x0D, 0x0A, 0x2D, (byte) 0xB4,
            0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
            (byte) 0xAE, 0x42, 0x60, (byte) 0x82
    };

    private static final byte[] VALID_JPEG_BYTES = new byte[]{
            (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0,
            0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00,
            (byte) 0xFF, (byte) 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
            (byte) 0xFF, (byte) 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
            (byte) 0xFF, (byte) 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
            (byte) 0xFF, (byte) 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0x00,
            (byte) 0xFF, (byte) 0xD9
    };

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

        upiMode = paymentModeRepository.findByCodeIgnoreCase("UPI")
                .orElseGet(() -> paymentModeRepository.save(PaymentMode.builder()
                        .code("UPI")
                        .name("UPI / QR")
                        .isActive(true)
                        .build()));
    }

    private Transaction createTestTransaction(User owner, TransactionStatus status) {
        return transactionRepository.save(Transaction.builder()
                .transactionNumber("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .transactionDate(LocalDate.now())
                .transactionType(TransactionType.OUT)
                .amount(new BigDecimal("1250.00"))
                .payerFrom(owner.getFullName())
                .recipientTo("Deco Vendor")
                .category(expenseCategory)
                .paymentMode(upiMode)
                .status(status)
                .createdBy(owner)
                .build());
    }

    @Test
    @DisplayName("1. Upload valid BILL PDF")
    void test01_validBillPdfUpload() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "tax_bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult result = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.documentType").value("BILL"))
                .andExpect(jsonPath("$.data.originalFilename").value("tax_bill.pdf"))
                .andExpect(jsonPath("$.data.contentType").value("application/pdf"))
                .andExpect(jsonPath("$.data.fileHashSha256").isNotEmpty())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        String docId = objectMapper.readTree(responseBody).path("data").path("id").asText();
        Document savedDoc = documentRepository.findById(UUID.fromString(docId)).orElseThrow();

        // Verify disk storage
        Path root = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
        Path targetPath = root.resolve(savedDoc.getFilePath()).normalize();
        assertThat(Files.exists(targetPath)).isTrue();
        assertThat(Files.size(targetPath)).isEqualTo(VALID_PDF_BYTES.length);

        // Verify audit log
        List<AuditLog> auditLogs = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("DOCUMENT", savedDoc.getId());
        assertThat(auditLogs).isNotEmpty();
        assertThat(auditLogs.get(0).getAction()).isEqualTo("CREATE");
    }

    @Test
    @DisplayName("2. Upload valid PAYMENT_SCREENSHOT PNG")
    void test02_validPaymentScreenshotPngUpload() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "screenshot.png", "image/png", VALID_PNG_BYTES
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "PAYMENT_SCREENSHOT")
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.documentType").value("PAYMENT_SCREENSHOT"))
                .andExpect(jsonPath("$.data.contentType").value("image/png"));
    }

    @Test
    @DisplayName("3. Upload valid OTHER JPEG")
    void test03_validJpegUpload() throws Exception {
        Transaction txn = createTestTransaction(accountantUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "receipt.jpg", "image/jpeg", VALID_JPEG_BYTES
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "OTHER")
                        .header("Authorization", "Bearer " + accountantToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.documentType").value("OTHER"))
                .andExpect(jsonPath("$.data.contentType").value("image/jpeg"));
    }

    @Test
    @DisplayName("4. Reject file exceeding 10MB limit")
    void test04_rejectFileExceeding10Mb() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        byte[] oversizedBytes = new byte[11 * 1024 * 1024]; // 11 MB
        MockMultipartFile file = new MockMultipartFile(
                "file", "large.pdf", "application/pdf", oversizedBytes
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("10 MB")));
    }

    @Test
    @DisplayName("5. Reject disallowed extension (.exe)")
    void test05_rejectDisallowedExtensionExe() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "script.exe", "application/octet-stream", "MZ\u0090\u0000".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "OTHER")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("6. Reject disallowed MIME type (text/html)")
    void test06_rejectDisallowedMimeTypeHtml() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "index.html", "text/html", "<html><body>test</body></html>".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "OTHER")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("7. Reject magic-bytes mismatch: executable renamed to .pdf")
    void test07_rejectMagicBytesMismatchExeRenamedToPdf() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        // An executable disguised with a .pdf extension
        byte[] fakePdfBytes = "MZ\u0090\u0000\u0003\u0000\u0000\u0000\u0004\u0000\u0000\u0000\u00FF\u00FF\u0000\u0000".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile(
                "file", "trojan.pdf", "application/pdf", fakePdfBytes
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        // Ensure staging directory did NOT retain rejected file
        Path staging = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().resolve("staging");
        if (Files.exists(staging)) {
            try (Stream<Path> stream = Files.list(staging)) {
                assertThat(stream.count()).isEqualTo(0);
            }
        }
    }

    @Test
    @DisplayName("8. Reject magic-bytes mismatch: text file renamed to .png")
    void test08_rejectMagicBytesMismatchTextRenamedToPng() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        byte[] fakePngBytes = "Plain text disguised as a PNG file".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.png", "image/png", fakePngBytes
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "PAYMENT_SCREENSHOT")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        // Ensure staging directory did NOT retain rejected file
        Path staging = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().resolve("staging");
        if (Files.exists(staging)) {
            try (Stream<Path> stream = Files.list(staging)) {
                assertThat(stream.count()).isEqualTo(0);
            }
        }
    }

    @Test
    @DisplayName("9. Reject upload to ARCHIVED transaction")
    void test09_rejectUploadToArchivedTransaction() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.ARCHIVED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(containsString("archived")));
    }

    @Test
    @DisplayName("10. Reject upload to nonexistent transaction")
    void test10_rejectUploadToNonexistentTransaction() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", UUID.randomUUID().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("11. IDOR: Member cannot upload document to another member's transaction")
    void test11_idorMemberCannotUploadToOtherMemberTransaction() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + member2Token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("12. Admin and Accountant can upload to any member's transaction")
    void test12_adminAndAccountantCanUploadToAnyTransaction() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionStatus.COMPLETED);
        MockMultipartFile file1 = new MockMultipartFile(
                "file", "admin_bill.pdf", "application/pdf", VALID_PDF_BYTES
        );
        MockMultipartFile file2 = new MockMultipartFile(
                "file", "accountant_bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file1)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated());

        mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file2)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + accountantToken))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("13. Staged file is cleaned up when staging file deletion is invoked")
    void test13_stagedFileCleanupHelper() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.pdf", "application/pdf", VALID_PDF_BYTES
        );
        var staged = storageService.stageFile(file, "pdf");
        assertThat(Files.exists(staged.stagedAbsolutePath())).isTrue();

        storageService.deleteStagedFile(staged.stagedAbsolutePath());
        assertThat(Files.exists(staged.stagedAbsolutePath())).isFalse();
    }

    @Test
    @DisplayName("14. File promoted after commit and staging dir is clean")
    void test14_filePromotedAfterCommit() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "promoted.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult result = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();

        String docId = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asText();
        Document doc = documentRepository.findById(UUID.fromString(docId)).orElseThrow();

        Path root = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
        Path targetPath = root.resolve(doc.getFilePath()).normalize();
        assertThat(Files.exists(targetPath)).isTrue();

        Path staging = root.resolve("staging");
        if (Files.exists(staging)) {
            try (Stream<Path> stream = Files.list(staging)) {
                assertThat(stream.count()).isEqualTo(0);
            }
        }
    }

    @Test
    @DisplayName("15. Preview document returns inline disposition and secure headers")
    void test15_previewDocumentInlineHeaders() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "preview_bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();

        String docId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(get("/api/v1/documents/{id}/preview", docId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"preview_bill.pdf\""))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/pdf"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(VALID_PDF_BYTES));
    }

    @Test
    @DisplayName("16. Download document returns attachment disposition")
    void test16_downloadDocumentAttachmentHeaders() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "download_bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();

        String docId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(get("/api/v1/documents/{id}/download", docId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"download_bill.pdf\""))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(content().bytes(VALID_PDF_BYTES));
    }

    @Test
    @DisplayName("17. IDOR: Member cannot preview another member's document")
    void test17_idorMemberCannotPreviewOtherMemberDocument() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "member1_bill.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String docId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).path("data").path("id").asText();

        // Member 2 attempts to preview Member 1's doc -> 404
        mockMvc.perform(get("/api/v1/documents/{id}/preview", docId)
                        .header("Authorization", "Bearer " + member2Token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("18. IDOR: Member cannot download another member's document")
    void test18_idorMemberCannotDownloadOtherMemberDocument() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "member1_doc.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String docId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).path("data").path("id").asText();

        // Member 2 attempts to download Member 1's doc -> 404
        mockMvc.perform(get("/api/v1/documents/{id}/download", docId)
                        .header("Authorization", "Bearer " + member2Token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("19. Path traversal prevention in filename")
    void test19_pathTraversalPrevention() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "../../../etc/passwd.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult result = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.originalFilename").value("passwd.pdf"))
                .andReturn();

        String docId = objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asText();
        Document doc = documentRepository.findById(UUID.fromString(docId)).orElseThrow();

        // File path must be confined to YYYY/MM/<stored-uuid>.pdf
        Path root = Paths.get(storageProperties.getUploadDir()).toAbsolutePath().normalize();
        Path filePath = root.resolve(doc.getFilePath()).normalize();
        assertThat(filePath.startsWith(root)).isTrue();
        assertThat(Files.exists(filePath)).isTrue();
    }

    @Test
    @DisplayName("20. Soft delete document by ADMIN records STATUS_CHANGE audit")
    void test20_softDeleteDocumentByAdmin() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "to_delete.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();

        String docId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(delete("/api/v1/documents/{id}", docId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Document deletedDoc = documentRepository.findById(UUID.fromString(docId)).orElseThrow();
        assertThat(deletedDoc.getDeletedAt()).isNotNull();
        assertThat(deletedDoc.getDeletedBy()).isNotNull();
        assertThat(deletedDoc.getDeletedBy().getId()).isEqualTo(adminUser.getId());

        // Verify audit log has action STATUS_CHANGE
        List<AuditLog> auditLogs = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("DOCUMENT", deletedDoc.getId());
        assertThat(auditLogs).isNotEmpty();
        assertThat(auditLogs.get(0).getAction()).isEqualTo("STATUS_CHANGE");
    }

    @Test
    @DisplayName("21. Soft-deleted document is not returned in listing or preview/download")
    void test21_softDeletedDocumentNotReturnedInListOrAccess() throws Exception {
        Transaction txn = createTestTransaction(adminUser, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "deleted_test.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andReturn();

        String docId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).path("data").path("id").asText();

        // Delete document
        mockMvc.perform(delete("/api/v1/documents/{id}", docId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        // Listing for transaction does not include deleted document
        mockMvc.perform(get("/api/v1/documents/transaction/{transactionId}", txn.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        // Preview returns 404
        mockMvc.perform(get("/api/v1/documents/{id}/preview", docId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());

        // Download returns 404
        mockMvc.perform(get("/api/v1/documents/{id}/download", docId)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("22. Member cannot delete document (403 Forbidden)")
    void test22_memberCannotDeleteDocument() throws Exception {
        Transaction txn = createTestTransaction(member1, TransactionStatus.COMPLETED);
        MockMultipartFile file = new MockMultipartFile(
                "file", "member_doc.pdf", "application/pdf", VALID_PDF_BYTES
        );

        MvcResult uploadResult = mockMvc.perform(multipart("/api/v1/documents/upload")
                        .file(file)
                        .param("transactionId", txn.getId().toString())
                        .param("documentType", "BILL")
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isCreated())
                .andReturn();

        String docId = objectMapper.readTree(uploadResult.getResponse().getContentAsString()).path("data").path("id").asText();

        // Member lacks documents:delete
        mockMvc.perform(delete("/api/v1/documents/{id}", docId)
                        .header("Authorization", "Bearer " + member1Token))
                .andExpect(status().isForbidden());
    }
}
