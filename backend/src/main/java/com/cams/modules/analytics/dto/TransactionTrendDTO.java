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

    public String getPeriod() {
        return date != null ? date.toString() : "";
    }

    public BigDecimal getTotalIn() {
        return inAmount != null ? inAmount : BigDecimal.ZERO;
    }

    public BigDecimal getTotalOut() {
        return outAmount != null ? outAmount : BigDecimal.ZERO;
    }

    public BigDecimal getNet() {
        return (inAmount != null ? inAmount : BigDecimal.ZERO).subtract(outAmount != null ? outAmount : BigDecimal.ZERO);
    }
}
