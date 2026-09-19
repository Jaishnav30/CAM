package com.cams.modules.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryBreakdownDTO {
    private UUID categoryId;
    private String categoryName;
    private BigDecimal amount;
    private long count;
    private double percentage;
    private String type;

    public BigDecimal getTotalAmount() {
        return amount;
    }

    public long getTransactionCount() {
        return count;
    }
}
