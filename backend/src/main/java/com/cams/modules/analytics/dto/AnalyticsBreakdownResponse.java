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
}
