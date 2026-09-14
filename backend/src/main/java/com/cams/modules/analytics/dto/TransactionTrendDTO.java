package com.cams.modules.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionTrendDTO {
    private LocalDate date;
    private BigDecimal inAmount;
    private BigDecimal outAmount;
    private long inCount;
    private long outCount;
}
