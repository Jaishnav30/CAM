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
public class PaymentModeBreakdownDTO {
    private String paymentModeCode;
    private String paymentModeName;
    private BigDecimal amount;
    private long count;
    private double percentage;
}
