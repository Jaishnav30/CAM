package com.cams.modules.transaction.dto;

import com.cams.modules.category.dto.CategoryResponse;
import com.cams.modules.paymentmode.dto.PaymentModeResponse;
import com.cams.modules.transaction.model.InvoiceStatus;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.transaction.model.TransactionStatus;
import com.cams.modules.transaction.model.TransactionType;
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
public class TransactionResponse {

    private UUID id;
    private String transactionNumber;
    private LocalDate transactionDate;
    private String payerFrom;
    private String recipientTo;
    private BigDecimal amount;
    private TransactionType transactionType;
    private PaymentModeResponse paymentMode;
    private String referenceNumber;
    private CategoryResponse category;
    private String comments;
    private InvoiceStatus invoiceStatus;
    private TransactionStatus status;
    private UserSummaryResponse createdBy;
    private Instant createdAt;
    private Instant updatedAt;

    public static TransactionResponse fromEntity(Transaction transaction) {
        if (transaction == null) {
            return null;
        }
        return TransactionResponse.builder()
                .id(transaction.getId())
                .transactionNumber(transaction.getTransactionNumber())
                .transactionDate(transaction.getTransactionDate())
                .payerFrom(transaction.getPayerFrom())
                .recipientTo(transaction.getRecipientTo())
                .amount(transaction.getAmount())
                .transactionType(transaction.getTransactionType())
                .paymentMode(transaction.getPaymentMode() != null ? PaymentModeResponse.fromEntity(transaction.getPaymentMode()) : null)
                .referenceNumber(transaction.getReferenceNumber())
                .category(transaction.getCategory() != null ? CategoryResponse.fromEntity(transaction.getCategory()) : null)
                .comments(transaction.getComments())
                .invoiceStatus(transaction.getInvoiceStatus())
                .status(transaction.getStatus())
                .createdBy(transaction.getCreatedBy() != null ? UserSummaryResponse.fromEntity(transaction.getCreatedBy()) : null)
                .createdAt(transaction.getCreatedAt())
                .updatedAt(transaction.getUpdatedAt())
                .build();
    }
}
