package com.cams.modules.transaction.service;

import com.cams.common.PagedResponse;
import com.cams.exception.ClaimLockedException;
import com.cams.exception.ConflictException;
import com.cams.exception.ResourceNotFoundException;
import com.cams.modules.audit.service.AuditLogService;
import com.cams.modules.category.model.Category;
import com.cams.modules.category.model.CategoryType;
import com.cams.modules.category.repository.CategoryRepository;
import com.cams.modules.document.model.Document;
import com.cams.modules.document.model.DocumentType;
import com.cams.modules.document.repository.DocumentRepository;
import com.cams.modules.paymentmode.model.PaymentMode;
import com.cams.modules.paymentmode.repository.PaymentModeRepository;
import com.cams.modules.reimbursement.model.ReimbursementStatus;
import com.cams.modules.reimbursement.repository.ReimbursementRepository;
import com.cams.modules.reimbursement.service.ReimbursementService;
import com.cams.modules.transaction.dto.*;
import com.cams.modules.transaction.model.InvoiceStatus;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.transaction.model.TransactionStatus;
import com.cams.modules.transaction.model.TransactionType;
import com.cams.modules.transaction.repository.TransactionRepository;
import com.cams.modules.transaction.repository.TransactionSpecification;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.cams.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final PaymentModeRepository paymentModeRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final ReimbursementRepository reimbursementRepository;
    private final ReimbursementService reimbursementService;
    private final DocumentRepository documentRepository;

    @Transactional
    public TransactionResponse createTransaction(
            CreateTransactionRequest request,
            UserPrincipal currentUser,
            String clientIp
    ) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to create a transaction");
        }

        boolean canCreateAny = currentUser.hasAuthority("transactions:create");
        boolean canCreateOwn = currentUser.hasAuthority("transactions:create_own");

        if (!canCreateAny && !canCreateOwn) {
            throw new AccessDeniedException("Insufficient permission to create transactions");
        }

        // Determine Transaction Type
        TransactionType transactionType = request.getTransactionType();
        if (!canCreateAny) {
            // Member restricted to OUT only
            if (transactionType != null && transactionType == TransactionType.IN) {
                throw new IllegalArgumentException("Members are only permitted to record OUT (expense) transactions");
            }
            transactionType = TransactionType.OUT;
        } else {
            // Admin / Accountant: default to OUT if not provided
            if (transactionType == null) {
                transactionType = TransactionType.OUT;
            }
        }

        // Validate Amount
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        // Validate & Retrieve Category
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));
        if (!category.isActive()) {
            throw new IllegalArgumentException("Category '" + category.getName() + "' is inactive and cannot be used");
        }
        if (!canCreateAny) {
            validateCategoryType(category, transactionType);
        }

        // Validate & Retrieve Payment Mode
        PaymentMode paymentMode = paymentModeRepository.findByCodeIgnoreCase(request.getPaymentMode())
                .orElseThrow(() -> new ResourceNotFoundException("Payment mode not found with code: " + request.getPaymentMode()));
        if (!paymentMode.isActive()) {
            throw new IllegalArgumentException("Payment mode '" + paymentMode.getCode() + "' is inactive and cannot be used");
        }

        // Server-enforce createdBy strictly from authenticated user principal (never trust client)
        User creator = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));

        // Generate Transaction Number server-side from PostgreSQL sequence (TXN-1001+)
        Long seq = transactionRepository.getNextTransactionSequence();
        String transactionNumber = String.format("TXN-%d", seq);

        // Determine Status
        TransactionStatus status = request.getStatus() != null ? request.getStatus() : TransactionStatus.COMPLETED;
        if (status == TransactionStatus.ARCHIVED) {
            throw new IllegalArgumentException("New transactions cannot be created in ARCHIVED status");
        }

        InvoiceStatus invoiceStatus = request.getInvoiceStatus() != null ? request.getInvoiceStatus() : InvoiceStatus.AVAILABLE;

        Transaction transaction = Transaction.builder()
                .transactionNumber(transactionNumber)
                .transactionDate(request.getTransactionDate())
                .payerFrom(request.getPayerFrom().trim())
                .recipientTo(request.getRecipientTo().trim())
                .amount(request.getAmount())
                .transactionType(transactionType)
                .paymentMode(paymentMode)
                .referenceNumber(request.getReferenceNumber() != null ? request.getReferenceNumber().trim() : null)
                .category(category)
                .comments(request.getComments() != null ? request.getComments().trim() : null)
                .invoiceStatus(invoiceStatus)
                .status(status)
                .createdBy(creator)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Transaction saved = transactionRepository.save(transaction);
        log.info("Transaction '{}' created by user '{}' [{}]", saved.getTransactionNumber(), currentUser.getUsername(), currentUser.getId());

        auditLogService.recordAudit(
                "TRANSACTION",
                saved.getId(),
                "CREATE",
                currentUser.getId(),
                clientIp,
                null,
                TransactionResponse.fromEntity(saved),
                "Transaction created: " + saved.getTransactionNumber()
        );

        if (Boolean.TRUE.equals(request.getRequestReimbursement())) {
            reimbursementService.createClaimInternal(saved, creator, clientIp);
        }

        return TransactionResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public PagedResponse<TransactionResponse> getTransactions(
            TransactionFilterParams filterParams,
            Pageable pageable,
            UserPrincipal currentUser
    ) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to view transactions");
        }

        boolean hasLedgerRead = currentUser.hasAuthority("transactions:read");
        boolean isMemberOnly = !hasLedgerRead;

        Specification<Transaction> spec = TransactionSpecification.withFilters(
                filterParams,
                currentUser.getId(),
                isMemberOnly
        );

        // Sanitize Pageable: enforce max page size 100 and support safe dynamic sorting
        int pageNumber = Math.max(pageable.getPageNumber(), 0);
        int pageSize = Math.min(Math.max(pageable.getPageSize(), 1), 100);
        Sort sort = Sort.by(Sort.Direction.DESC, "transactionDate")
                .and(Sort.by(Sort.Direction.DESC, "createdAt"));

        if (pageable.getSort() != null && pageable.getSort().isSorted()) {
            for (Sort.Order order : pageable.getSort()) {
                String property = order.getProperty();
                Sort.Direction direction = order.getDirection();
                if ("transactionDate".equalsIgnoreCase(property)) {
                    sort = Sort.by(direction, "transactionDate")
                            .and(Sort.by(direction, "createdAt"));
                    break;
                } else if ("transactionNumber".equalsIgnoreCase(property)) {
                    sort = Sort.by(direction, "transactionNumber");
                    break;
                } else if ("amount".equalsIgnoreCase(property)) {
                    sort = Sort.by(direction, "amount")
                            .and(Sort.by(Sort.Direction.DESC, "transactionDate"));
                    break;
                }
            }
        }

        Pageable safePageable = PageRequest.of(pageNumber, pageSize, sort);
        Page<Transaction> page = transactionRepository.findAll(spec, safePageable);

        List<UUID> ids = page.getContent().stream().map(Transaction::getId).toList();
        Map<UUID, List<Document>> docsByTxn = ids.isEmpty() ? Collections.emptyMap() :
                documentRepository.findByTransactionIdInAndDeletedAtIsNull(ids).stream()
                        .collect(Collectors.groupingBy(d -> d.getTransaction().getId()));

        Page<TransactionResponse> responsePage = page.map(txn -> {
            TransactionResponse resp = TransactionResponse.fromEntity(txn);
            List<Document> docs = docsByTxn.get(txn.getId());
            if (docs != null) {
                for (Document d : docs) {
                    if (d.getDocumentType() == DocumentType.PAYMENT_SCREENSHOT && resp.getScreenshotDocumentId() == null) {
                        resp.setScreenshotDocumentId(d.getId());
                    } else if (d.getDocumentType() == DocumentType.BILL && resp.getBillDocumentId() == null) {
                        resp.setBillDocumentId(d.getId());
                    }
                }
            }
            return resp;
        });

        return PagedResponse.of(responsePage);
    }

    @Transactional(readOnly = true)
    public TransactionResponse getTransactionById(UUID id, UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to view transaction");
        }

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));

        boolean hasLedgerRead = currentUser.hasAuthority("transactions:read");
        if (!hasLedgerRead) {
            // IDOR defense: Member can only view own transactions
            if (!transaction.getCreatedBy().getId().equals(currentUser.getId())) {
                log.warn("IDOR attempt: User '{}' tried to view transaction '{}' owned by '{}'",
                        currentUser.getId(), id, transaction.getCreatedBy().getId());
                throw new ResourceNotFoundException("Transaction not found with ID: " + id);
            }
        }

        TransactionResponse resp = TransactionResponse.fromEntity(transaction);
        populateDocumentIds(resp, id);
        return resp;
    }

    @Transactional
    public TransactionResponse updateTransaction(
            UUID id,
            UpdateTransactionRequest request,
            UserPrincipal currentUser,
            String clientIp
    ) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to update transaction");
        }

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));

        boolean hasGlobalUpdate = currentUser.hasAuthority("transactions:update");
        boolean isOwner = transaction.getCreatedBy().getId().equals(currentUser.getId());
        boolean hasCreateOwn = currentUser.hasAuthority("transactions:create_own");

        if (!hasGlobalUpdate && !(isOwner && hasCreateOwn)) {
            log.warn("Access denied: User '{}' tried to update transaction '{}'", currentUser.getId(), id);
            throw new ResourceNotFoundException("Transaction not found with ID: " + id);
        }

        // Archived transactions cannot be modified
        if (transaction.getStatus() == TransactionStatus.ARCHIVED) {
            throw new ConflictException("Archived transactions cannot be modified");
        }

        // Immutability check: cannot edit transaction if its reimbursement claim is APPROVED or REIMBURSED
        reimbursementRepository.findByTransactionId(id).ifPresent(claim -> {
            if (claim.getStatus() == ReimbursementStatus.APPROVED || claim.getStatus() == ReimbursementStatus.REIMBURSED) {
                throw new ClaimLockedException("Transaction is locked and cannot be modified because its reimbursement claim "
                        + claim.getClaimNumber() + " is " + claim.getStatus());
            }
        });

        // Validate Amount
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }

        // Determine Transaction Type
        TransactionType updatedType = transaction.getTransactionType();
        if (!hasGlobalUpdate) {
            // Member cannot change to IN
            if (request.getTransactionType() != null && request.getTransactionType() == TransactionType.IN) {
                throw new IllegalArgumentException("Members are not permitted to change transaction type to IN");
            }
            updatedType = TransactionType.OUT;
        } else if (request.getTransactionType() != null) {
            updatedType = request.getTransactionType();
        }

        // Validate & Retrieve Category
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));
        if (!category.isActive()) {
            throw new IllegalArgumentException("Category '" + category.getName() + "' is inactive and cannot be used");
        }
        if (!hasGlobalUpdate) {
            validateCategoryType(category, updatedType);
        }

        // Validate & Retrieve Payment Mode
        PaymentMode paymentMode = paymentModeRepository.findByCodeIgnoreCase(request.getPaymentMode())
                .orElseThrow(() -> new ResourceNotFoundException("Payment mode not found with code: " + request.getPaymentMode()));
        if (!paymentMode.isActive()) {
            throw new IllegalArgumentException("Payment mode '" + paymentMode.getCode() + "' is inactive and cannot be used");
        }

        TransactionResponse oldState = TransactionResponse.fromEntity(transaction);

        // Apply updates (id, transactionNumber, createdBy, createdAt remain strictly unchanged)
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setPayerFrom(request.getPayerFrom().trim());
        transaction.setRecipientTo(request.getRecipientTo().trim());
        transaction.setAmount(request.getAmount());
        transaction.setTransactionType(updatedType);
        transaction.setPaymentMode(paymentMode);
        transaction.setReferenceNumber(request.getReferenceNumber() != null ? request.getReferenceNumber().trim() : null);
        transaction.setCategory(category);
        transaction.setComments(request.getComments() != null ? request.getComments().trim() : null);
        if (request.getInvoiceStatus() != null) {
            transaction.setInvoiceStatus(request.getInvoiceStatus());
        }
        if (request.getStatus() != null && request.getStatus() != TransactionStatus.ARCHIVED) {
            transaction.setStatus(request.getStatus());
        }

        Transaction updated = transactionRepository.save(transaction);
        log.info("Transaction '{}' updated by user '{}'", updated.getTransactionNumber(), currentUser.getUsername());

        TransactionResponse updatedResponse = TransactionResponse.fromEntity(updated);
        populateDocumentIds(updatedResponse, updated.getId());

        auditLogService.recordAudit(
                "TRANSACTION",
                updated.getId(),
                "UPDATE",
                currentUser.getId(),
                clientIp,
                oldState,
                updatedResponse,
                "Transaction updated: " + updated.getTransactionNumber()
        );

        return updatedResponse;
    }

    private void populateDocumentIds(TransactionResponse resp, UUID transactionId) {
        if (resp == null || transactionId == null) return;
        List<Document> docs = documentRepository.findByTransactionIdAndDeletedAtIsNullOrderByCreatedAtDesc(transactionId);
        for (Document d : docs) {
            if (d.getDocumentType() == DocumentType.PAYMENT_SCREENSHOT && resp.getScreenshotDocumentId() == null) {
                resp.setScreenshotDocumentId(d.getId());
            } else if (d.getDocumentType() == DocumentType.BILL && resp.getBillDocumentId() == null) {
                resp.setBillDocumentId(d.getId());
            }
        }
    }

    @Transactional
    public TransactionResponse archiveTransaction(
            UUID id,
            ArchiveTransactionRequest request,
            UserPrincipal currentUser,
            String clientIp
    ) {
        if (currentUser == null || !currentUser.hasAuthority("transactions:archive")) {
            throw new AccessDeniedException("Permission 'transactions:archive' required to archive transactions");
        }

        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + id));

        if (transaction.getStatus() == TransactionStatus.ARCHIVED) {
            throw new ConflictException("Transaction is already archived");
        }

        // Immutability check: cannot archive transaction if its reimbursement claim is APPROVED or REIMBURSED
        reimbursementRepository.findByTransactionId(id).ifPresent(claim -> {
            if (claim.getStatus() == ReimbursementStatus.APPROVED || claim.getStatus() == ReimbursementStatus.REIMBURSED) {
                throw new ClaimLockedException("Transaction is locked and cannot be archived because its reimbursement claim "
                        + claim.getClaimNumber() + " is " + claim.getStatus());
            }
        });

        TransactionResponse oldState = TransactionResponse.fromEntity(transaction);
        transaction.setStatus(TransactionStatus.ARCHIVED);

        Transaction archived = transactionRepository.save(transaction);
        log.info("Transaction '{}' archived by user '{}'. Reason: {}", archived.getTransactionNumber(), currentUser.getUsername(), request.getReason());

        auditLogService.recordAudit(
                "TRANSACTION",
                archived.getId(),
                "ARCHIVE",
                currentUser.getId(),
                clientIp,
                oldState,
                TransactionResponse.fromEntity(archived),
                "Transaction archived: " + archived.getTransactionNumber() + ". Reason: " + request.getReason().trim()
        );

        return TransactionResponse.fromEntity(archived);
    }

    private void validateCategoryType(Category category, TransactionType transactionType) {
        if (category.getType() == CategoryType.BOTH) {
            return;
        }
        if (transactionType == TransactionType.IN && category.getType() != CategoryType.INCOME) {
            throw new IllegalArgumentException(
                    "Category '" + category.getName() + "' is configured for " + category.getType() +
                    " but transaction type is IN (Income)"
            );
        }
        if (transactionType == TransactionType.OUT && category.getType() != CategoryType.EXPENSE) {
            throw new IllegalArgumentException(
                    "Category '" + category.getName() + "' is configured for " + category.getType() +
                    " but transaction type is OUT (Expense)"
            );
        }
    }
}
