package com.cams.modules.analytics.service;

import com.cams.modules.analytics.dto.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    @PersistenceContext
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public AnalyticsSummaryResponse getSummary(AnalyticsFilterParams params) {
        LocalDate startDate = params != null ? params.getStartDate() : null;
        LocalDate endDate = params != null ? params.getEndDate() : null;

        // 1. Transaction Summary Metrics (Only COMPLETED transactions for financial totals)
        StringBuilder txnJpql = new StringBuilder(
                "SELECT " +
                "COALESCE(SUM(CASE WHEN t.transactionType = com.cams.modules.transaction.model.TransactionType.IN AND t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED THEN t.amount ELSE 0 END), 0), " +
                "COALESCE(SUM(CASE WHEN t.transactionType = com.cams.modules.transaction.model.TransactionType.OUT AND t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED THEN t.amount ELSE 0 END), 0), " +
                "COUNT(CASE WHEN t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED THEN 1 END), " +
                "COUNT(CASE WHEN t.transactionType = com.cams.modules.transaction.model.TransactionType.IN AND t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED THEN 1 END), " +
                "COUNT(CASE WHEN t.transactionType = com.cams.modules.transaction.model.TransactionType.OUT AND t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED THEN 1 END), " +
                "COUNT(CASE WHEN t.status = com.cams.modules.transaction.model.TransactionStatus.ARCHIVED THEN 1 END) " +
                "FROM Transaction t WHERE 1=1"
        );
        if (startDate != null) txnJpql.append(" AND t.transactionDate >= :startDate");
        if (endDate != null) txnJpql.append(" AND t.transactionDate <= :endDate");

        TypedQuery<Object[]> txnQuery = entityManager.createQuery(txnJpql.toString(), Object[].class);
        if (startDate != null) txnQuery.setParameter("startDate", startDate);
        if (endDate != null) txnQuery.setParameter("endDate", endDate);

        List<Object[]> txnMetricsList = txnQuery.getResultList();
        Object[] txnMetrics = (txnMetricsList != null && !txnMetricsList.isEmpty()) ? txnMetricsList.get(0) : new Object[6];

        BigDecimal totalIn = txnMetrics[0] != null ? (BigDecimal) txnMetrics[0] : BigDecimal.ZERO;
        BigDecimal totalOut = txnMetrics[1] != null ? (BigDecimal) txnMetrics[1] : BigDecimal.ZERO;
        long completedCount = txnMetrics[2] != null ? ((Number) txnMetrics[2]).longValue() : 0L;
        long inCount = txnMetrics[3] != null ? ((Number) txnMetrics[3]).longValue() : 0L;
        long outCount = txnMetrics[4] != null ? ((Number) txnMetrics[4]).longValue() : 0L;
        long archivedCount = txnMetrics[5] != null ? ((Number) txnMetrics[5]).longValue() : 0L;

        // 2. Reimbursement Summary Metrics (Amount derived from linked transaction)
        StringBuilder reimbJpql = new StringBuilder(
                "SELECT " +
                "COUNT(CASE WHEN r.status = com.cams.modules.reimbursement.model.ReimbursementStatus.SUBMITTED THEN 1 END), " +
                "COUNT(CASE WHEN r.status = com.cams.modules.reimbursement.model.ReimbursementStatus.APPROVED THEN 1 END), " +
                "COUNT(CASE WHEN r.status = com.cams.modules.reimbursement.model.ReimbursementStatus.REJECTED THEN 1 END), " +
                "COUNT(CASE WHEN r.status = com.cams.modules.reimbursement.model.ReimbursementStatus.REIMBURSED THEN 1 END), " +
                "COALESCE(SUM(CASE WHEN r.status = com.cams.modules.reimbursement.model.ReimbursementStatus.REIMBURSED THEN t.amount ELSE 0 END), 0) " +
                "FROM Reimbursement r JOIN r.transaction t WHERE 1=1"
        );
        if (startDate != null) reimbJpql.append(" AND t.transactionDate >= :startDate");
        if (endDate != null) reimbJpql.append(" AND t.transactionDate <= :endDate");

        TypedQuery<Object[]> reimbQuery = entityManager.createQuery(reimbJpql.toString(), Object[].class);
        if (startDate != null) reimbQuery.setParameter("startDate", startDate);
        if (endDate != null) reimbQuery.setParameter("endDate", endDate);

        List<Object[]> reimbMetricsList = reimbQuery.getResultList();
        Object[] reimbMetrics = (reimbMetricsList != null && !reimbMetricsList.isEmpty()) ? reimbMetricsList.get(0) : new Object[5];

        long reimbSubmitted = reimbMetrics[0] != null ? ((Number) reimbMetrics[0]).longValue() : 0L;
        long reimbApproved = reimbMetrics[1] != null ? ((Number) reimbMetrics[1]).longValue() : 0L;
        long reimbRejected = reimbMetrics[2] != null ? ((Number) reimbMetrics[2]).longValue() : 0L;
        long reimbReimbursed = reimbMetrics[3] != null ? ((Number) reimbMetrics[3]).longValue() : 0L;
        BigDecimal totalReimbursedAmount = reimbMetrics[4] != null ? (BigDecimal) reimbMetrics[4] : BigDecimal.ZERO;

        BigDecimal netAmount = totalIn.subtract(totalOut);

        return AnalyticsSummaryResponse.builder()
                .totalInAmount(totalIn)
                .totalOutAmount(totalOut)
                .netAmount(netAmount)
                .transactionCount(completedCount)
                .inTransactionCount(inCount)
                .outTransactionCount(outCount)
                .completedTransactionCount(completedCount)
                .archivedTransactionCount(archivedCount)
                .reimbursementSubmittedCount(reimbSubmitted)
                .reimbursementApprovedCount(reimbApproved)
                .reimbursementRejectedCount(reimbRejected)
                .reimbursementReimbursedCount(reimbReimbursed)
                .totalReimbursedAmount(totalReimbursedAmount)
                .build();
    }

    @Transactional(readOnly = true)
    public AnalyticsBreakdownResponse getBreakdowns(AnalyticsFilterParams params) {
        LocalDate startDate = params != null ? params.getStartDate() : null;
        LocalDate endDate = params != null ? params.getEndDate() : null;

        // 1. Expenses by Category
        StringBuilder expCatJpql = new StringBuilder(
                "SELECT t.category.id, t.category.name, SUM(t.amount), COUNT(t) " +
                "FROM Transaction t " +
                "WHERE t.transactionType = com.cams.modules.transaction.model.TransactionType.OUT " +
                "AND t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED"
        );
        if (startDate != null) expCatJpql.append(" AND t.transactionDate >= :startDate");
        if (endDate != null) expCatJpql.append(" AND t.transactionDate <= :endDate");
        expCatJpql.append(" GROUP BY t.category.id, t.category.name ORDER BY SUM(t.amount) DESC");

        TypedQuery<Object[]> expCatQuery = entityManager.createQuery(expCatJpql.toString(), Object[].class);
        if (startDate != null) expCatQuery.setParameter("startDate", startDate);
        if (endDate != null) expCatQuery.setParameter("endDate", endDate);

        List<Object[]> expCatRows = expCatQuery.getResultList();
        BigDecimal totalExpenses = BigDecimal.ZERO;
        for (Object[] row : expCatRows) {
            if (row[2] != null) totalExpenses = totalExpenses.add((BigDecimal) row[2]);
        }
        List<CategoryBreakdownDTO> expensesByCategory = new ArrayList<>();
        for (Object[] row : expCatRows) {
            BigDecimal amount = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            double percentage = totalExpenses.compareTo(BigDecimal.ZERO) > 0
                    ? amount.multiply(BigDecimal.valueOf(100)).divide(totalExpenses, 2, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;
            expensesByCategory.add(CategoryBreakdownDTO.builder()
                    .categoryId((UUID) row[0])
                    .categoryName((String) row[1])
                    .amount(amount)
                    .count(row[3] != null ? ((Number) row[3]).longValue() : 0L)
                    .percentage(percentage)
                    .type("OUT")
                    .build());
        }

        // 2. Income by Category
        StringBuilder incCatJpql = new StringBuilder(
                "SELECT t.category.id, t.category.name, SUM(t.amount), COUNT(t) " +
                "FROM Transaction t " +
                "WHERE t.transactionType = com.cams.modules.transaction.model.TransactionType.IN " +
                "AND t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED"
        );
        if (startDate != null) incCatJpql.append(" AND t.transactionDate >= :startDate");
        if (endDate != null) incCatJpql.append(" AND t.transactionDate <= :endDate");
        incCatJpql.append(" GROUP BY t.category.id, t.category.name ORDER BY SUM(t.amount) DESC");

        TypedQuery<Object[]> incCatQuery = entityManager.createQuery(incCatJpql.toString(), Object[].class);
        if (startDate != null) incCatQuery.setParameter("startDate", startDate);
        if (endDate != null) incCatQuery.setParameter("endDate", endDate);

        List<Object[]> incCatRows = incCatQuery.getResultList();
        BigDecimal totalIncome = BigDecimal.ZERO;
        for (Object[] row : incCatRows) {
            if (row[2] != null) totalIncome = totalIncome.add((BigDecimal) row[2]);
        }
        List<CategoryBreakdownDTO> incomeByCategory = new ArrayList<>();
        for (Object[] row : incCatRows) {
            BigDecimal amount = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            double percentage = totalIncome.compareTo(BigDecimal.ZERO) > 0
                    ? amount.multiply(BigDecimal.valueOf(100)).divide(totalIncome, 2, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;
            incomeByCategory.add(CategoryBreakdownDTO.builder()
                    .categoryId((UUID) row[0])
                    .categoryName((String) row[1])
                    .amount(amount)
                    .count(row[3] != null ? ((Number) row[3]).longValue() : 0L)
                    .percentage(percentage)
                    .type("IN")
                    .build());
        }

        // 3. Expenses by Payment Mode
        StringBuilder expModeJpql = new StringBuilder(
                "SELECT t.paymentMode.code, t.paymentMode.name, SUM(t.amount), COUNT(t) " +
                "FROM Transaction t " +
                "WHERE t.transactionType = com.cams.modules.transaction.model.TransactionType.OUT " +
                "AND t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED"
        );
        if (startDate != null) expModeJpql.append(" AND t.transactionDate >= :startDate");
        if (endDate != null) expModeJpql.append(" AND t.transactionDate <= :endDate");
        expModeJpql.append(" GROUP BY t.paymentMode.code, t.paymentMode.name ORDER BY SUM(t.amount) DESC");

        TypedQuery<Object[]> expModeQuery = entityManager.createQuery(expModeJpql.toString(), Object[].class);
        if (startDate != null) expModeQuery.setParameter("startDate", startDate);
        if (endDate != null) expModeQuery.setParameter("endDate", endDate);

        List<Object[]> expModeRows = expModeQuery.getResultList();
        List<PaymentModeBreakdownDTO> expensesByPaymentMode = new ArrayList<>();
        for (Object[] row : expModeRows) {
            BigDecimal amount = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
            double percentage = totalExpenses.compareTo(BigDecimal.ZERO) > 0
                    ? amount.multiply(BigDecimal.valueOf(100)).divide(totalExpenses, 2, RoundingMode.HALF_UP).doubleValue()
                    : 0.0;
            expensesByPaymentMode.add(PaymentModeBreakdownDTO.builder()
                    .paymentModeCode((String) row[0])
                    .paymentModeName((String) row[1])
                    .amount(amount)
                    .count(row[3] != null ? ((Number) row[3]).longValue() : 0L)
                    .percentage(percentage)
                    .build());
        }

        // 4. Trend Over Time
        StringBuilder trendJpql = new StringBuilder(
                "SELECT t.transactionDate, " +
                "COALESCE(SUM(CASE WHEN t.transactionType = com.cams.modules.transaction.model.TransactionType.IN THEN t.amount ELSE 0 END), 0), " +
                "COALESCE(SUM(CASE WHEN t.transactionType = com.cams.modules.transaction.model.TransactionType.OUT THEN t.amount ELSE 0 END), 0), " +
                "COUNT(CASE WHEN t.transactionType = com.cams.modules.transaction.model.TransactionType.IN THEN 1 END), " +
                "COUNT(CASE WHEN t.transactionType = com.cams.modules.transaction.model.TransactionType.OUT THEN 1 END) " +
                "FROM Transaction t " +
                "WHERE t.status = com.cams.modules.transaction.model.TransactionStatus.COMPLETED"
        );
        if (startDate != null) trendJpql.append(" AND t.transactionDate >= :startDate");
        if (endDate != null) trendJpql.append(" AND t.transactionDate <= :endDate");
        trendJpql.append(" GROUP BY t.transactionDate ORDER BY t.transactionDate ASC");

        TypedQuery<Object[]> trendQuery = entityManager.createQuery(trendJpql.toString(), Object[].class);
        if (startDate != null) trendQuery.setParameter("startDate", startDate);
        if (endDate != null) trendQuery.setParameter("endDate", endDate);

        List<Object[]> trendRows = trendQuery.getResultList();
        List<TransactionTrendDTO> transactionsOverTime = new ArrayList<>();
        for (Object[] row : trendRows) {
            transactionsOverTime.add(TransactionTrendDTO.builder()
                    .date((LocalDate) row[0])
                    .inAmount(row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO)
                    .outAmount(row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO)
                    .inCount(row[3] != null ? ((Number) row[3]).longValue() : 0L)
                    .outCount(row[4] != null ? ((Number) row[4]).longValue() : 0L)
                    .build());
        }

        return AnalyticsBreakdownResponse.builder()
                .expensesByCategory(expensesByCategory)
                .incomeByCategory(incomeByCategory)
                .expensesByPaymentMode(expensesByPaymentMode)
                .transactionsOverTime(transactionsOverTime)
                .build();
    }
}
