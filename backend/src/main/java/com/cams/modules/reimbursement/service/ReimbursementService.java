package com.cams.modules.reimbursement.service;

import com.cams.common.PagedResponse;
import com.cams.exception.ClaimLockedException;
import com.cams.exception.ConflictException;
import com.cams.exception.DuplicateResourceException;
import com.cams.exception.ResourceNotFoundException;
import com.cams.modules.audit.service.AuditLogService;
import com.cams.modules.reimbursement.dto.*;
import com.cams.modules.reimbursement.model.Reimbursement;
import com.cams.modules.reimbursement.model.ReimbursementStatus;
import com.cams.modules.reimbursement.repository.ReimbursementRepository;
import com.cams.modules.reimbursement.repository.ReimbursementSpecification;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.transaction.model.TransactionStatus;
import com.cams.modules.transaction.model.TransactionType;
import com.cams.modules.transaction.repository.TransactionRepository;
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

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReimbursementService {

    private final ReimbursementRepository reimbursementRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public ReimbursementResponse createClaimInternal(Transaction txn, User claimant, String clientIp) {
        if (txn == null) {
            throw new IllegalArgumentException("Transaction is required");
        }
        if (claimant == null) {
            throw new IllegalArgumentException("Claimant is required");
        }

        if (txn.getTransactionType() != TransactionType.OUT) {
            throw new IllegalArgumentException("Reimbursement can only be requested for OUT (expense) transactions");
        }

        if (txn.getStatus() == TransactionStatus.ARCHIVED) {
            throw new ConflictException("Cannot create reimbursement for an archived transaction");
        }

        if (reimbursementRepository.existsByTransactionId(txn.getId())) {
            throw new DuplicateResourceException("Transaction already has an associated reimbursement claim");
        }

        Long seq = reimbursementRepository.getNextClaimNumberSequence();
        String claimNumber = "CLM-" + seq;

        Reimbursement claim = Reimbursement.builder()
                .claimNumber(claimNumber)
                .transaction(txn)
                .claimant(claimant)
                .status(ReimbursementStatus.SUBMITTED)
                .rejectionReason(null)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        Reimbursement saved = reimbursementRepository.save(claim);

        auditLogService.recordAudit(
                "REIMBURSEMENT",
                saved.getId(),
                "CREATE",
                claimant.getId(),
                clientIp,
                null,
                Map.of(
                        "claimNumber", claimNumber,
                        "transactionId", txn.getId().toString(),
                        "amount", txn.getAmount().toString(),
                        "status", ReimbursementStatus.SUBMITTED.name()
                ),
                "Submitted initial reimbursement claim " + claimNumber + " for transaction " + txn.getTransactionNumber()
        );

        log.info("Reimbursement claim '{}' successfully created for transaction '{}' by claimant '{}'",
                claimNumber, txn.getTransactionNumber(), claimant.getEmail());

        return ReimbursementResponse.fromEntity(saved);
    }

    @Transactional
    public ReimbursementResponse submitClaim(SubmitReimbursementRequest req, UserPrincipal currentUser, String clientIp) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to submit reimbursement claim");
        }

        if (!currentUser.hasAuthority("reimbursements:submit")) {
            throw new AccessDeniedException("Insufficient permission to submit reimbursement claims");
        }

        Transaction txn = transactionRepository.findById(req.getTransactionId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + req.getTransactionId()));

        if (reimbursementRepository.existsByTransactionId(txn.getId())) {
            throw new DuplicateResourceException("Transaction already has an associated reimbursement claim");
        }

        if (txn.getTransactionType() != TransactionType.OUT) {
            throw new IllegalArgumentException("Reimbursement can only be requested for OUT (expense) transactions");
        }

        if (txn.getStatus() == TransactionStatus.ARCHIVED) {
            throw new ConflictException("Cannot create reimbursement for an archived transaction");
        }

        boolean hasGlobalSubmit = currentUser.hasAuthority("transactions:create");
        if (!hasGlobalSubmit && !txn.getCreatedBy().getId().equals(currentUser.getId())) {
            log.warn("IDOR attempt: User '{}' tried to submit reimbursement for transaction '{}' owned by '{}'",
                    currentUser.getId(), txn.getId(), txn.getCreatedBy().getId());
            throw new ResourceNotFoundException("Transaction not found with ID: " + req.getTransactionId());
        }

        User claimant = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return createClaimInternal(txn, claimant, clientIp);
    }

    @Transactional
    public ReimbursementResponse approveClaim(UUID id, UserPrincipal currentUser, String clientIp) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to approve reimbursement claim");
        }

        if (!currentUser.hasAuthority("reimbursements:approve")) {
            throw new AccessDeniedException("Insufficient permission to approve reimbursement claims");
        }

        Reimbursement claim = reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement claim not found with ID: " + id));

        if (claim.getStatus() == ReimbursementStatus.APPROVED || claim.getStatus() == ReimbursementStatus.REIMBURSED) {
            throw new ClaimLockedException("Reimbursement claim " + claim.getClaimNumber() + " is already " + claim.getStatus());
        }

        if (claim.getStatus() != ReimbursementStatus.SUBMITTED) {
            throw new ConflictException("Only claims in SUBMITTED status can be approved. Current status: " + claim.getStatus());
        }

        claim.setStatus(ReimbursementStatus.APPROVED);
        Reimbursement saved = reimbursementRepository.save(claim);

        auditLogService.recordAudit(
                "REIMBURSEMENT",
                saved.getId(),
                "STATUS_CHANGE",
                currentUser.getId(),
                clientIp,
                Map.of("status", ReimbursementStatus.SUBMITTED.name()),
                Map.of("status", ReimbursementStatus.APPROVED.name()),
                "Approved reimbursement claim " + saved.getClaimNumber()
        );

        log.info("Reimbursement claim '{}' approved by user '{}'", saved.getClaimNumber(), currentUser.getUsername());
        return ReimbursementResponse.fromEntity(saved);
    }

    @Transactional
    public ReimbursementResponse rejectClaim(UUID id, RejectReimbursementRequest req, UserPrincipal currentUser, String clientIp) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to reject reimbursement claim");
        }

        // Must have reimbursements:review and must be ADMIN or ACCOUNTANT
        boolean canReject = currentUser.hasAuthority("reimbursements:review")
                && (currentUser.hasRole("ADMIN") || currentUser.hasRole("ACCOUNTANT"));
        if (!canReject) {
            throw new AccessDeniedException("Insufficient permission to reject reimbursement claims");
        }

        if (req.getReason() == null || req.getReason().trim().isEmpty()) {
            throw new IllegalArgumentException("Rejection reason is mandatory and cannot be blank");
        }

        Reimbursement claim = reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement claim not found with ID: " + id));

        if (claim.getStatus() == ReimbursementStatus.APPROVED || claim.getStatus() == ReimbursementStatus.REIMBURSED) {
            throw new ClaimLockedException("Reimbursement claim " + claim.getClaimNumber() + " is locked (" + claim.getStatus() + ") and cannot be rejected");
        }

        if (claim.getStatus() != ReimbursementStatus.SUBMITTED) {
            throw new ConflictException("Only claims in SUBMITTED status can be rejected. Current status: " + claim.getStatus());
        }

        String reason = req.getReason().trim();
        claim.setStatus(ReimbursementStatus.REJECTED);
        claim.setRejectionReason(reason);
        Reimbursement saved = reimbursementRepository.save(claim);

        auditLogService.recordAudit(
                "REIMBURSEMENT",
                saved.getId(),
                "STATUS_CHANGE",
                currentUser.getId(),
                clientIp,
                Map.of("status", ReimbursementStatus.SUBMITTED.name()),
                Map.of("status", ReimbursementStatus.REJECTED.name(), "rejectionReason", reason),
                "Rejected reimbursement claim " + saved.getClaimNumber() + ": " + reason
        );

        log.info("Reimbursement claim '{}' rejected by user '{}' with reason: {}", saved.getClaimNumber(), currentUser.getUsername(), reason);
        return ReimbursementResponse.fromEntity(saved);
    }

    @Transactional
    public ReimbursementResponse resubmitClaim(UUID id, UserPrincipal currentUser, String clientIp) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to resubmit reimbursement claim");
        }

        if (!currentUser.hasAuthority("reimbursements:submit")) {
            throw new AccessDeniedException("Insufficient permission to resubmit reimbursement claims");
        }

        Reimbursement claim = reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement claim not found with ID: " + id));

        // IDOR: member can only resubmit own claim
        boolean hasGlobalSubmit = currentUser.hasAuthority("transactions:create");
        if (!hasGlobalSubmit && !claim.getClaimant().getId().equals(currentUser.getId())) {
            log.warn("IDOR attempt: User '{}' tried to resubmit claim '{}' owned by '{}'",
                    currentUser.getId(), id, claim.getClaimant().getId());
            throw new ResourceNotFoundException("Reimbursement claim not found with ID: " + id);
        }

        if (claim.getStatus() == ReimbursementStatus.APPROVED || claim.getStatus() == ReimbursementStatus.REIMBURSED) {
            throw new ClaimLockedException("Reimbursement claim " + claim.getClaimNumber() + " is locked (" + claim.getStatus() + ") and cannot be resubmitted");
        }

        if (claim.getStatus() != ReimbursementStatus.REJECTED) {
            throw new ConflictException("Only claims in REJECTED status can be resubmitted. Current status: " + claim.getStatus());
        }

        if (claim.getTransaction().getStatus() == TransactionStatus.ARCHIVED) {
            throw new ConflictException("Underlying transaction is archived and cannot be resubmitted");
        }

        String oldReason = claim.getRejectionReason();
        claim.setStatus(ReimbursementStatus.SUBMITTED);
        claim.setRejectionReason(null); // Clear previous rejection reason
        Reimbursement saved = reimbursementRepository.save(claim);

        auditLogService.recordAudit(
                "REIMBURSEMENT",
                saved.getId(),
                "STATUS_CHANGE",
                currentUser.getId(),
                clientIp,
                Map.of("status", ReimbursementStatus.REJECTED.name(), "rejectionReason", oldReason != null ? oldReason : ""),
                Map.of("status", ReimbursementStatus.SUBMITTED.name(), "rejectionReason", ""),
                "Resubmitted reimbursement claim " + saved.getClaimNumber()
        );

        log.info("Reimbursement claim '{}' resubmitted by user '{}'", saved.getClaimNumber(), currentUser.getUsername());
        return ReimbursementResponse.fromEntity(saved);
    }

    @Transactional
    public ReimbursementResponse markReimbursed(UUID id, UserPrincipal currentUser, String clientIp) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to mark reimbursement as paid");
        }

        if (!currentUser.hasAuthority("reimbursements:mark_paid")) {
            throw new AccessDeniedException("Insufficient permission to mark reimbursement as paid");
        }

        Reimbursement claim = reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement claim not found with ID: " + id));

        if (claim.getStatus() == ReimbursementStatus.REIMBURSED) {
            throw new ClaimLockedException("Reimbursement claim " + claim.getClaimNumber() + " is already marked as REIMBURSED");
        }

        if (claim.getStatus() != ReimbursementStatus.APPROVED) {
            throw new ConflictException("Only claims in APPROVED status can be marked as REIMBURSED. Current status: " + claim.getStatus());
        }

        // CRITICAL: Terminal transition. Do NOT create another transaction.
        claim.setStatus(ReimbursementStatus.REIMBURSED);
        Reimbursement saved = reimbursementRepository.save(claim);

        auditLogService.recordAudit(
                "REIMBURSEMENT",
                saved.getId(),
                "STATUS_CHANGE",
                currentUser.getId(),
                clientIp,
                Map.of("status", ReimbursementStatus.APPROVED.name()),
                Map.of("status", ReimbursementStatus.REIMBURSED.name()),
                "Marked reimbursement claim " + saved.getClaimNumber() + " as REIMBURSED"
        );

        log.info("Reimbursement claim '{}' marked as REIMBURSED by user '{}'", saved.getClaimNumber(), currentUser.getUsername());
        return ReimbursementResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public ReimbursementResponse getClaimById(UUID id, UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to view reimbursement claim");
        }

        Reimbursement claim = reimbursementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reimbursement claim not found with ID: " + id));

        boolean hasGlobalRead = currentUser.hasAuthority("reimbursements:read");
        if (!hasGlobalRead && !claim.getClaimant().getId().equals(currentUser.getId())) {
            log.warn("IDOR attempt: User '{}' tried to view claim '{}' owned by '{}'",
                    currentUser.getId(), id, claim.getClaimant().getId());
            throw new ResourceNotFoundException("Reimbursement claim not found with ID: " + id);
        }

        return ReimbursementResponse.fromEntity(claim);
    }

    @Transactional(readOnly = true)
    public PagedResponse<ReimbursementResponse> getClaims(
            ReimbursementFilterParams params,
            Pageable pageable,
            UserPrincipal currentUser
    ) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to view reimbursement claims");
        }

        boolean hasGlobalRead = currentUser.hasAuthority("reimbursements:read");
        Specification<Reimbursement> spec = ReimbursementSpecification.withFilters(
                params,
                currentUser.getId(),
                !hasGlobalRead
        );

        // Safe sort handling
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        if (params != null && params.getSortBy() != null && !params.getSortBy().isBlank()) {
            String sortBy = params.getSortBy();
            Sort.Direction dir = "asc".equalsIgnoreCase(params.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
            if ("createdAt".equalsIgnoreCase(sortBy) || "claimNumber".equalsIgnoreCase(sortBy) || "status".equalsIgnoreCase(sortBy)) {
                sort = Sort.by(dir, sortBy);
            }
        }

        int pageNum = pageable != null ? pageable.getPageNumber() : 0;
        int pageSize = pageable != null ? pageable.getPageSize() : 20;
        Pageable safePageable = PageRequest.of(pageNum, pageSize, sort);

        Page<Reimbursement> page = reimbursementRepository.findAll(spec, safePageable);
        return PagedResponse.of(page.map(ReimbursementResponse::fromEntity));
    }
}
