package com.cams.modules.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsBreakdownResponse {
    private List<CategoryBreakdownDTO> expensesByCategory;
    private List<CategoryBreakdownDTO> incomeByCategory;
    private List<PaymentModeBreakdownDTO> expensesByPaymentMode;
    private List<TransactionTrendDTO> transactionsOverTime;

    public List<CategoryBreakdownDTO> getCategoryBreakdown() {
        java.util.List<CategoryBreakdownDTO> combined = new java.util.ArrayList<>();
        if (expensesByCategory != null) combined.addAll(expensesByCategory);
        if (incomeByCategory != null) combined.addAll(incomeByCategory);
        return combined;
    }

    public List<PaymentModeBreakdownDTO> getPaymentModeBreakdown() {
        return expensesByPaymentMode != null ? expensesByPaymentMode : java.util.Collections.emptyList();
    }

    public List<TransactionTrendDTO> getTrends() {
        return transactionsOverTime != null ? transactionsOverTime : java.util.Collections.emptyList();
    }
}
