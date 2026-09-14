package com.cams.modules.transaction.dto;

import com.cams.modules.transaction.model.InvoiceStatus;
import com.cams.modules.transaction.model.TransactionStatus;
import com.cams.modules.transaction.model.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateTransactionRequest {

    @NotNull(message = "Transaction date is required")
    private LocalDate transactionDate;

    @NotBlank(message = "Payer (payerFrom) is required")
    @Size(max = 150, message = "Payer name cannot exceed 150 characters")
    private String payerFrom;

    @NotBlank(message = "Recipient (recipientTo) is required")
    @Size(max = 150, message = "Recipient name cannot exceed 150 characters")
    private String recipientTo;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    private TransactionType transactionType;

    @NotBlank(message = "Payment mode is required")
    @Size(max = 50, message = "Payment mode cannot exceed 50 characters")
    private String paymentMode;

    @Size(max = 100, message = "Reference number cannot exceed 100 characters")
    private String referenceNumber;

    @NotNull(message = "Category ID is required")
    private UUID categoryId;

    @Size(max = 2000, message = "Comments cannot exceed 2000 characters")
    private String comments;

    private InvoiceStatus invoiceStatus;

    private TransactionStatus status;

    // Untrusted client-supplied createdBy field (must be ignored/rejected by backend)
    private UUID createdBy;

    // Optional reimbursement request flag for atomic creation
    private Boolean requestReimbursement;
}
