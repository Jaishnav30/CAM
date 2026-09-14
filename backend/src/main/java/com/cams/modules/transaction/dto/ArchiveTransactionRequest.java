package com.cams.modules.transaction.dto;

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
public class ArchiveTransactionRequest {

    @NotBlank(message = "Archive reason is required")
    @Size(max = 500, message = "Archive reason cannot exceed 500 characters")
    private String reason;
}
