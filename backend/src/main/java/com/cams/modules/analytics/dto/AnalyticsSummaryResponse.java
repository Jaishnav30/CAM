package com.cams.modules.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsSummaryResponse {

    private BigDecimal totalInAmount;
    private BigDecimal totalOutAmount;
    private BigDecimal netAmount;
    private long transactionCount;
    private long inTransactionCount;
    private long outTransactionCount;
    private long completedTransactionCount;
    private long archivedTransactionCount;
    private long reimbursementSubmittedCount;
    private long reimbursementApprovedCount;
    private long reimbursementRejectedCount;
    private long reimbursementReimbursedCount;
    private BigDecimal totalReimbursedAmount;
}
