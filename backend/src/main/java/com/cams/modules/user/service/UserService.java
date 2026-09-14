package com.cams.modules.user.service;

import com.cams.exception.ResourceNotFoundException;
import com.cams.modules.audit.service.AuditLogService;
import com.cams.modules.reimbursement.model.ReimbursementStatus;
import com.cams.modules.reimbursement.repository.ReimbursementRepository;
import com.cams.modules.role.model.Role;
import com.cams.modules.role.repository.RoleRepository;
import com.cams.modules.transaction.repository.TransactionRepository;
import com.cams.modules.user.dto.RegistrationApprovalRequest;
import com.cams.modules.user.dto.RegistrationRejectionRequest;
import com.cams.modules.user.dto.UserProfileStatsDto;
import com.cams.modules.user.dto.UserRegistrationItemDto;
import com.cams.modules.user.model.ApprovalStatus;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.cams.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TransactionRepository transactionRepository;
    private final ReimbursementRepository reimbursementRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<UserRegistrationItemDto> getRegistrations(String statusFilter) {
        List<User> users;
        if (statusFilter != null && !statusFilter.isBlank() && !statusFilter.equalsIgnoreCase("ALL")) {
            try {
                ApprovalStatus status = ApprovalStatus.valueOf(statusFilter.toUpperCase());
                users = userRepository.findByApprovalStatusOrderByCreatedAtDesc(status);
            } catch (IllegalArgumentException ex) {
                users = userRepository.findAllByOrderByCreatedAtDesc();
            }
        } else {
            users = userRepository.findAllByOrderByCreatedAtDesc();
        }

        return users.stream()
                .map(UserRegistrationItemDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserRegistrationItemDto approveRegistration(UUID userId, RegistrationApprovalRequest request, UserPrincipal adminPrincipal) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (request != null && request.getRole() != null && !request.getRole().isBlank()) {
            String roleName = request.getRole().trim().toUpperCase();
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));
            user.setRoles(new HashSet<>(Set.of(role)));
        }

        user.setApprovalStatus(ApprovalStatus.APPROVED);
        user.setActive(true);
        user.setRejectionReason(null);

        User savedUser = userRepository.save(user);

        auditLogService.recordAudit(
                "USER",
                userId,
                "STATUS_CHANGE",
                adminPrincipal.getId(),
                null,
                null,
                null,
                "Approved registration for user " + savedUser.getUsername() + " (" + savedUser.getEmail() + ")"
        );

        log.info("User registration approved for {} by admin {}", savedUser.getUsername(), adminPrincipal.getUsername());
        return UserRegistrationItemDto.fromEntity(savedUser);
    }

    @Transactional
    public UserRegistrationItemDto rejectRegistration(UUID userId, RegistrationRejectionRequest request, UserPrincipal adminPrincipal) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setApprovalStatus(ApprovalStatus.REJECTED);
        user.setActive(false);
        user.setRejectionReason(request != null && request.getReason() != null ? request.getReason().trim() : "Rejected by administrator");

        User savedUser = userRepository.save(user);

        auditLogService.recordAudit(
                "USER",
                userId,
                "STATUS_CHANGE",
                adminPrincipal.getId(),
                null,
                null,
                null,
                "Rejected registration for user " + savedUser.getUsername() + ". Reason: " + savedUser.getRejectionReason()
        );

        log.info("User registration rejected for {} by admin {}", savedUser.getUsername(), adminPrincipal.getUsername());
        return UserRegistrationItemDto.fromEntity(savedUser);
    }

    @Transactional(readOnly = true)
    public UserProfileStatsDto getProfileStats(UUID userId, UserPrincipal currentPrincipal) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        long totalTransactionsCount = transactionRepository.countByUserId(userId);
        BigDecimal totalAmountSpent = transactionRepository.sumAmountSpentByUserId(userId);

        long totalReimbursementsCount = reimbursementRepository.countByClaimantId(userId);
        BigDecimal totalReimbursementApplied = reimbursementRepository.sumClaimAmountByClaimantId(userId);

        long pendingReimbursementCount = reimbursementRepository.countByClaimantIdAndStatus(userId, ReimbursementStatus.SUBMITTED);
        BigDecimal pendingReimbursementAmount = reimbursementRepository.sumClaimAmountByClaimantIdAndStatus(userId, ReimbursementStatus.SUBMITTED);

        long approvedReimbursementCount = reimbursementRepository.countByClaimantIdAndStatus(userId, ReimbursementStatus.APPROVED);
        BigDecimal approvedReimbursementAmount = reimbursementRepository.sumClaimAmountByClaimantIdAndStatus(userId, ReimbursementStatus.APPROVED);

        long paidReimbursementCount = reimbursementRepository.countByClaimantIdAndStatus(userId, ReimbursementStatus.REIMBURSED);
        BigDecimal paidReimbursementAmount = reimbursementRepository.sumClaimAmountByClaimantIdAndStatus(userId, ReimbursementStatus.REIMBURSED);

        long rejectedReimbursementCount = reimbursementRepository.countByClaimantIdAndStatus(userId, ReimbursementStatus.REJECTED);
        BigDecimal rejectedReimbursementAmount = reimbursementRepository.sumClaimAmountByClaimantIdAndStatus(userId, ReimbursementStatus.REJECTED);

        Set<String> roleNames = user.getRoles() != null
                ? user.getRoles().stream().map(Role::getName).collect(Collectors.toSet())
                : Set.of();

        Set<String> permissionCodes = user.getRoles() != null
                ? user.getRoles().stream()
                    .filter(r -> r.getPermissions() != null)
                    .flatMap(r -> r.getPermissions().stream())
                    .map(p -> p.getCode())
                    .collect(Collectors.toSet())
                : Set.of();

        return UserProfileStatsDto.builder()
                .userId(user.getId())
                .username(user.getUsername() != null ? user.getUsername() : user.getEmail())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .batch(user.getBatch())
                .committee(user.getCommittee())
                .upiId(user.getUpiId())
                .approvalStatus(user.getApprovalStatus() != null ? user.getApprovalStatus().name() : "APPROVED")
                .active(user.isActive())
                .deleted(user.isDeleted())
                .deletedAt(user.getDeletedAt())
                .roles(roleNames)
                .permissions(permissionCodes)
                .memberSince(user.getCreatedAt())
                .totalTransactionsCount(totalTransactionsCount)
                .totalAmountSpent(totalAmountSpent != null ? totalAmountSpent : BigDecimal.ZERO)
                .totalReimbursementsCount(totalReimbursementsCount)
                .totalReimbursementApplied(totalReimbursementApplied != null ? totalReimbursementApplied : BigDecimal.ZERO)
                .pendingReimbursementCount(pendingReimbursementCount)
                .pendingReimbursementAmount(pendingReimbursementAmount != null ? pendingReimbursementAmount : BigDecimal.ZERO)
                .approvedReimbursementCount(approvedReimbursementCount)
                .approvedReimbursementAmount(approvedReimbursementAmount != null ? approvedReimbursementAmount : BigDecimal.ZERO)
                .paidReimbursementCount(paidReimbursementCount)
                .paidReimbursementAmount(paidReimbursementAmount != null ? paidReimbursementAmount : BigDecimal.ZERO)
                .rejectedReimbursementCount(rejectedReimbursementCount)
                .rejectedReimbursementAmount(rejectedReimbursementAmount != null ? rejectedReimbursementAmount : BigDecimal.ZERO)
                .build();
    }

    @Transactional(readOnly = true)
    public List<UserRegistrationItemDto> getAllUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(UserRegistrationItemDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserRegistrationItemDto blockUser(UUID userId, UserPrincipal adminPrincipal) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (user.getId().equals(adminPrincipal.getId())) {
            throw new IllegalArgumentException("Administrators cannot block their own account.");
        }
        if (user.isDeleted()) {
            throw new IllegalStateException("Cannot block a deleted user.");
        }

        user.setActive(false);
        User savedUser = userRepository.save(user);

        auditLogService.recordAudit(
                "USER",
                userId,
                "STATUS_CHANGE",
                adminPrincipal.getId(),
                null,
                null,
                null,
                "Blocked user " + savedUser.getUsername() + " (" + savedUser.getEmail() + ")"
        );

        log.info("User {} was blocked by admin {}", savedUser.getUsername(), adminPrincipal.getUsername());
        return UserRegistrationItemDto.fromEntity(savedUser);
    }

    @Transactional
    public UserRegistrationItemDto unblockUser(UUID userId, UserPrincipal adminPrincipal) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (user.isDeleted()) {
            throw new IllegalStateException("Cannot unblock a deleted user.");
        }

        user.setActive(true);
        User savedUser = userRepository.save(user);

        auditLogService.recordAudit(
                "USER",
                userId,
                "STATUS_CHANGE",
                adminPrincipal.getId(),
                null,
                null,
                null,
                "Unblocked user " + savedUser.getUsername() + " (" + savedUser.getEmail() + ")"
        );

        log.info("User {} was unblocked by admin {}", savedUser.getUsername(), adminPrincipal.getUsername());
        return UserRegistrationItemDto.fromEntity(savedUser);
    }

    @Transactional
    public UserRegistrationItemDto deleteUser(UUID userId, UserPrincipal adminPrincipal) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (user.getId().equals(adminPrincipal.getId())) {
            throw new IllegalArgumentException("Administrators cannot delete their own account.");
        }
        if (user.isDeleted()) {
            throw new IllegalStateException("User is already deleted.");
        }

        String origEmail = user.getEmail();
        String origUsername = user.getUsername();

        user.setDeleted(true);
        user.setDeletedAt(Instant.now());
        user.setActive(false);

        // Free up unique constraints on email and username so the user can re-register immediately
        if (origEmail != null && !origEmail.startsWith("deleted_")) {
            user.setEmail("deleted_" + user.getId() + "_" + origEmail);
        }
        if (origUsername != null && !origUsername.startsWith("deleted_")) {
            String shortId = user.getId().toString().substring(0, 8);
            String safeUser = origUsername.length() > 60 ? origUsername.substring(0, 60) : origUsername;
            user.setUsername("deleted_" + shortId + "_" + safeUser);
        }

        User savedUser = userRepository.save(user);

        auditLogService.recordAudit(
                "USER",
                userId,
                "STATUS_CHANGE",
                adminPrincipal.getId(),
                null,
                null,
                null,
                "Permanently deleted user " + origUsername + " (" + origEmail + "). Released email and username for re-registration. Associated records remain intact."
        );

        log.info("User {} was permanently deleted by admin {}", origUsername, adminPrincipal.getUsername());
        return UserRegistrationItemDto.fromEntity(savedUser);
    }
}
