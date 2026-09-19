package com.cams.modules.document.service;

import com.cams.exception.ClaimLockedException;
import com.cams.exception.ConflictException;
import com.cams.exception.ResourceNotFoundException;
import com.cams.modules.audit.service.AuditLogService;
import com.cams.modules.document.dto.DocumentResponse;
import com.cams.modules.document.model.Document;
import com.cams.modules.document.model.DocumentType;
import com.cams.modules.document.repository.DocumentRepository;
import com.cams.modules.document.service.DocumentStorageService.StagedFileInfo;
import com.cams.modules.document.service.DocumentValidationService.ValidatedFileMetadata;
import com.cams.modules.reimbursement.model.ReimbursementStatus;
import com.cams.modules.reimbursement.repository.ReimbursementRepository;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.transaction.model.TransactionStatus;
import com.cams.modules.transaction.repository.TransactionRepository;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.cams.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final DocumentValidationService validationService;
    private final DocumentStorageService storageService;
    private final AuditLogService auditLogService;
    private final ReimbursementRepository reimbursementRepository;

    public record DocumentFileDownload(
            Document document,
            Resource resource
    ) {}

    @Transactional
    public DocumentResponse uploadDocument(
            UUID transactionId,
            DocumentType documentType,
            MultipartFile file,
            UserPrincipal currentUser,
            String clientIp
    ) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to upload documents");
        }

        if (!currentUser.hasAuthority("documents:upload")) {
            throw new AccessDeniedException("Insufficient permission to upload documents");
        }

        if (transactionId == null) {
            throw new IllegalArgumentException("Transaction ID is required");
        }
        if (documentType == null) {
            throw new IllegalArgumentException("Document type is required");
        }

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + transactionId));

        if (transaction.getStatus() == TransactionStatus.ARCHIVED) {
            throw new ConflictException("Cannot attach documents to an archived transaction");
        }

        // Immutability check: cannot attach documents if associated reimbursement claim is APPROVED or REIMBURSED
        reimbursementRepository.findByTransactionId(transactionId).ifPresent(claim -> {
            if (claim.getStatus() == ReimbursementStatus.APPROVED || claim.getStatus() == ReimbursementStatus.REIMBURSED) {
                throw new ClaimLockedException("Cannot attach documents because the associated reimbursement claim "
                        + claim.getClaimNumber() + " is locked (" + claim.getStatus() + ")");
            }
        });

        // IDOR protection: if user does not have global ledger read, ensure they own the transaction
        boolean hasGlobalLedgerRead = currentUser.hasAuthority("transactions:read");
        if (!hasGlobalLedgerRead && !transaction.getCreatedBy().getId().equals(currentUser.getId())) {
            log.warn("IDOR attempt: User '{}' tried to attach document to transaction '{}' owned by '{}'",
                    currentUser.getId(), transactionId, transaction.getCreatedBy().getId());
            throw new ResourceNotFoundException("Transaction not found with ID: " + transactionId);
        }

        // 1. Validate file size before staging
        validationService.validateSize(file);

        // 2. Stage file physically to staging directory
        String originalFilename = file.getOriginalFilename();
        String ext = extractExtension(originalFilename);
        StagedFileInfo staged;
        try {
            staged = storageService.stageFile(file, ext);
        } catch (IOException e) {
            log.error("Failed to stage uploaded file: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to process file upload", e);
        }

        // 3. Validate content and type on the staged file before accepting it
        ValidatedFileMetadata metadata;
        try {
            metadata = validationService.validateContentAndType(staged.stagedAbsolutePath(), originalFilename, file.getContentType());
        } catch (Exception ex) {
            // Immediate purge of rejected file
            storageService.deleteStagedFile(staged.stagedAbsolutePath());
            log.warn("Uploaded file rejected during content validation: {}", ex.getMessage());
            throw ex;
        }

        // 4. Prepare target storage destination day-wise: uploads/yyyy-MM-dd/<subfolder>/txn_no_comments.ext
        String relativeDir = resolveRelativeDir(documentType, transaction);
        String storedFilename = generateStoredFilename(documentType, transaction, metadata.normalizedExtension(), relativeDir);
        String filePath = relativeDir + "/" + storedFilename;

        // 5. Register TransactionSynchronization for afterCommit promotion and rollback cleanup
        Path stagedPath = staged.stagedAbsolutePath();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    storageService.promoteStagedFile(stagedPath, relativeDir, storedFilename);
                } catch (Exception e) {
                    log.error("CRITICAL: Failed to promote staged file '{}' to '{}/{}'. Staged file retained for fallback: {}",
                            stagedPath, relativeDir, storedFilename, e.getMessage(), e);
                }
            }

            @Override
            public void afterCompletion(int status) {
                if (status != TransactionSynchronization.STATUS_COMMITTED) {
                    log.info("Transaction completed with status {}. Cleaning up staged file '{}'", status, stagedPath);
                    storageService.deleteStagedFile(stagedPath);
                }
            }
        });

        // 6. Persist Document entity
        User uploader = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Document document = Document.builder()
                .transaction(transaction)
                .documentType(documentType)
                .originalFilename(metadata.sanitizedOriginalFilename())
                .storedFilename(storedFilename)
                .filePath(filePath)
                .contentType(metadata.detectedContentType())
                .fileSizeBytes(staged.fileSizeBytes())
                .fileHashSha256(staged.fileHashSha256())
                .uploadedBy(uploader)
                .createdAt(Instant.now())
                .build();

        Document saved = documentRepository.save(document);

        // 7. Synchronous audit log
        auditLogService.recordAudit(
                "DOCUMENT",
                saved.getId(),
                "CREATE",
                currentUser.getId(),
                clientIp,
                null,
                Map.of(
                        "transactionId", transaction.getId().toString(),
                        "documentType", documentType.name(),
                        "originalFilename", metadata.sanitizedOriginalFilename(),
                        "fileSizeBytes", staged.fileSizeBytes(),
                        "fileHashSha256", staged.fileHashSha256()
                ),
                "Attached document " + metadata.sanitizedOriginalFilename() + " (" + documentType + ") to transaction " + transaction.getTransactionNumber()
        );

        log.info("Document '{}' ({}) successfully registered for transaction '{}' by user '{}'",
                saved.getId(), metadata.sanitizedOriginalFilename(), transaction.getTransactionNumber(), currentUser.getUsername());

        return DocumentResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocumentsForTransaction(UUID transactionId, UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to view documents");
        }

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + transactionId));

        boolean hasGlobalRead = currentUser.hasAuthority("documents:read") || currentUser.hasAuthority("transactions:read");
        if (!hasGlobalRead && !transaction.getCreatedBy().getId().equals(currentUser.getId())) {
            log.warn("IDOR attempt: User '{}' tried to list documents for transaction '{}' owned by '{}'",
                    currentUser.getId(), transactionId, transaction.getCreatedBy().getId());
            throw new ResourceNotFoundException("Transaction not found with ID: " + transactionId);
        }

        return documentRepository.findByTransactionIdAndDeletedAtIsNullOrderByCreatedAtDesc(transactionId)
                .stream()
                .map(DocumentResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentFileDownload loadDocumentFile(UUID documentId, UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to access document");
        }

        Document document = documentRepository.findByIdAndDeletedAtIsNull(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        boolean hasGlobalRead = currentUser.hasAuthority("documents:read");
        if (!hasGlobalRead) {
            // IDOR check: Member can only access documents belonging to transactions they created
            if (!document.getTransaction().getCreatedBy().getId().equals(currentUser.getId())) {
                log.warn("IDOR attempt: User '{}' tried to access document '{}' on transaction owned by '{}'",
                        currentUser.getId(), documentId, document.getTransaction().getCreatedBy().getId());
                throw new ResourceNotFoundException("Document not found with ID: " + documentId);
            }
        }

        Resource resource = storageService.loadAsResource(document.getFilePath());
        return new DocumentFileDownload(document, resource);
    }

    @Transactional
    public void softDeleteDocument(UUID documentId, UserPrincipal currentUser, String clientIp) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to delete document");
        }

        if (!currentUser.hasAuthority("documents:delete")) {
            throw new AccessDeniedException("Insufficient permission to delete documents");
        }

        Document document = documentRepository.findByIdAndDeletedAtIsNull(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        // Immutability check: cannot delete documents if associated reimbursement claim is APPROVED or REIMBURSED
        reimbursementRepository.findByTransactionId(document.getTransaction().getId()).ifPresent(claim -> {
            if (claim.getStatus() == ReimbursementStatus.APPROVED || claim.getStatus() == ReimbursementStatus.REIMBURSED) {
                throw new ClaimLockedException("Cannot delete documents because the associated reimbursement claim "
                        + claim.getClaimNumber() + " is locked (" + claim.getStatus() + ")");
            }
        });

        User deleter = userRepository.findById(currentUser.getId()).orElse(null);
        document.setDeletedAt(Instant.now());
        document.setDeletedBy(deleter);
        documentRepository.save(document);

        // Audit log with STATUS_CHANGE (as required by DB constraint)
        auditLogService.recordAudit(
                "DOCUMENT",
                document.getId(),
                "STATUS_CHANGE",
                currentUser.getId(),
                clientIp,
                Map.of("deletedAt", "null"),
                Map.of("deletedAt", document.getDeletedAt().toString(), "deletedBy", currentUser.getId().toString()),
                "Document soft-deleted: " + document.getOriginalFilename()
        );

        log.info("Document '{}' ({}) soft-deleted by user '{}'",
                document.getId(), document.getOriginalFilename(), currentUser.getUsername());
    }

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) return "";
        return filename.substring(dotIndex + 1).trim();
    }

    private String resolveRelativeDir(DocumentType documentType, Transaction transaction) {
        LocalDate date = transaction.getTransactionDate() != null ? transaction.getTransactionDate() : LocalDate.now();
        String dateFolder = date.toString(); // e.g. "2026-09-01"

        String typeFolder;
        if (documentType == DocumentType.PAYMENT_SCREENSHOT) {
            typeFolder = "screenshots";
        } else if (documentType == DocumentType.BILL) {
            typeFolder = "bill_images";
        } else {
            typeFolder = "other_documents";
        }

        return dateFolder + "/" + typeFolder;
    }

    private String generateStoredFilename(DocumentType documentType, Transaction transaction, String extension, String relativeDir) {
        String txnNo = "txn";
        if (transaction.getTransactionNumber() != null && !transaction.getTransactionNumber().isBlank()) {
            txnNo = transaction.getTransactionNumber().toLowerCase()
                    .replaceAll("[^a-z0-9]", "_")
                    .replaceAll("_+", "_")
                    .replaceAll("^_|_$", "");
        } else if (transaction.getId() != null) {
            txnNo = "txn_" + transaction.getId().toString().substring(0, 8);
        }

        String sanitizedComments = "";
        if (transaction.getComments() != null && !transaction.getComments().isBlank()) {
            sanitizedComments = transaction.getComments().toLowerCase()
                    .replaceAll("[^a-z0-9]", "_")
                    .replaceAll("_+", "_")
                    .replaceAll("^_|_$", "");
            if (sanitizedComments.length() > 50) {
                sanitizedComments = sanitizedComments.substring(0, 50).replaceAll("_$", "");
            }
        }

        String baseName = !sanitizedComments.isBlank() ? (txnNo + "_" + sanitizedComments) : txnNo;
        String ext = (extension != null && !extension.isBlank()) ? extension : "bin";

        Path targetDir = storageService.getRootLocation().resolve(relativeDir).normalize();
        String candidate = baseName + "." + ext;
        Path candidatePath = targetDir.resolve(candidate).normalize();

        int counter = 1;
        while (Files.exists(candidatePath)) {
            candidate = baseName + "_" + counter + "." + ext;
            candidatePath = targetDir.resolve(candidate).normalize();
            counter++;
        }

        return candidate;
    }
}
