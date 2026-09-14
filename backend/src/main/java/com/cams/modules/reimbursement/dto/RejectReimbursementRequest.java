package com.cams.modules.reimbursement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RejectReimbursementRequest {

    @NotBlank(message = "Rejection reason is mandatory and cannot be blank")
    @Size(max = 1000, message = "Rejection reason cannot exceed 1000 characters")
    private String reason;
}
