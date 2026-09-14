package com.cams.modules.reimbursement.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitReimbursementRequest {

    @NotNull(message = "Transaction ID is required")
    private UUID transactionId;
}
