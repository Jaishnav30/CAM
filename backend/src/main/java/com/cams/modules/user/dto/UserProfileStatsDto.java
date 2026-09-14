package com.cams.modules.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileStatsDto {

    private UUID userId;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;
    private String batch;
    private String committee;
    private String upiId;
    private String approvalStatus;
    private boolean active;
    private boolean deleted;
    private Instant deletedAt;
    private Set<String> roles;
    private Set<String> permissions;
    private Instant memberSince;

    // Financial Stats
    private long totalTransactionsCount;
    private BigDecimal totalAmountSpent;

    private long totalReimbursementsCount;
    private BigDecimal totalReimbursementApplied;

    // Reimbursement breakdown
    private BigDecimal pendingReimbursementAmount;
    private long pendingReimbursementCount;

    private BigDecimal approvedReimbursementAmount;
    private long approvedReimbursementCount;

    private BigDecimal paidReimbursementAmount;
    private long paidReimbursementCount;

    private BigDecimal rejectedReimbursementAmount;
    private long rejectedReimbursementCount;
}
