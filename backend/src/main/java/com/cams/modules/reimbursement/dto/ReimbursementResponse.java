package com.cams.modules.reimbursement.dto;

import com.cams.modules.category.dto.CategoryResponse;
import com.cams.modules.paymentmode.dto.PaymentModeResponse;
import com.cams.modules.reimbursement.model.Reimbursement;
import com.cams.modules.reimbursement.model.ReimbursementStatus;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.user.dto.UserSummaryResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReimbursementResponse {

    private UUID id;
    private String claimNumber;
    private UUID transactionId;
    private String transactionNumber;
    private LocalDate transactionDate;
    private BigDecimal amount;
    private String payerFrom;
    private String recipientTo;
    private CategoryResponse category;
    private PaymentModeResponse paymentMode;
    private UserSummaryResponse claimant;
    private ReimbursementStatus status;
    private String rejectionReason;
    private Instant createdAt;
    private Instant updatedAt;

    public static ReimbursementResponse fromEntity(Reimbursement r) {
        if (r == null) {
            return null;
        }
        Transaction txn = r.getTransaction();
        return ReimbursementResponse.builder()
                .id(r.getId())
                .claimNumber(r.getClaimNumber())
                .transactionId(txn != null ? txn.getId() : null)
                .transactionNumber(txn != null ? txn.getTransactionNumber() : null)
                .transactionDate(txn != null ? txn.getTransactionDate() : null)
                .amount(txn != null ? txn.getAmount() : null)
                .payerFrom(txn != null ? txn.getPayerFrom() : null)
                .recipientTo(txn != null ? txn.getRecipientTo() : null)
                .category(txn != null && txn.getCategory() != null ? CategoryResponse.fromEntity(txn.getCategory()) : null)
                .paymentMode(txn != null && txn.getPaymentMode() != null ? PaymentModeResponse.fromEntity(txn.getPaymentMode()) : null)
                .claimant(r.getClaimant() != null ? UserSummaryResponse.fromEntity(r.getClaimant()) : null)
                .status(r.getStatus())
                .rejectionReason(r.getRejectionReason())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
