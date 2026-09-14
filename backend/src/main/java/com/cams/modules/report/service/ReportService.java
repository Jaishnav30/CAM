package com.cams.modules.report.service;

import com.cams.modules.reimbursement.dto.ReimbursementResponse;
import com.cams.modules.reimbursement.model.Reimbursement;
import com.cams.modules.reimbursement.repository.ReimbursementRepository;
import com.cams.modules.report.dto.ReimbursementReportFilterParams;
import com.cams.modules.report.dto.TransactionReportFilterParams;
import com.cams.modules.report.util.CsvExportUtil;
import com.cams.modules.transaction.dto.TransactionResponse;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.transaction.model.TransactionStatus;
import com.cams.modules.transaction.repository.TransactionRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final TransactionRepository transactionRepository;
    private final ReimbursementRepository reimbursementRepository;

    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsReportData(TransactionReportFilterParams params) {
        Specification<Transaction> spec = buildTransactionSpec(params);
        List<Transaction> transactions = transactionRepository.findAll(
                spec,
                Sort.by(Sort.Direction.DESC, "transactionDate").and(Sort.by(Sort.Direction.DESC, "transactionNumber"))
        );
        return transactions.stream().map(TransactionResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public byte[] generateTransactionCsv(TransactionReportFilterParams params) {
        Specification<Transaction> spec = buildTransactionSpec(params);
        List<Transaction> transactions = transactionRepository.findAll(
                spec,
                Sort.by(Sort.Direction.DESC, "transactionDate").and(Sort.by(Sort.Direction.DESC, "transactionNumber"))
        );

        StringBuilder sb = new StringBuilder();
        // Column headers
        sb.append(CsvExportUtil.buildCsvRow(
                "Date",
                "Transaction #",
                "Type",
                "Payer / Recipient",
                "Category",
                "Payment Mode",
                "Amount",
                "Status",
                "Created By"
        ));

        for (Transaction txn : transactions) {
            String payerRecipient = (txn.getPayerFrom() != null ? txn.getPayerFrom() : "") + " / " +
                                    (txn.getRecipientTo() != null ? txn.getRecipientTo() : "");
            String category = txn.getCategory() != null ? txn.getCategory().getName() : "";
            String mode = txn.getPaymentMode() != null ? txn.getPaymentMode().getName() : "";
            String createdBy = txn.getCreatedBy() != null ? txn.getCreatedBy().getFullName() : "";

            sb.append(CsvExportUtil.buildCsvRow(
                    txn.getTransactionDate(),
                    txn.getTransactionNumber(),
                    txn.getTransactionType(),
                    payerRecipient,
                    category,
                    mode,
                    txn.getAmount(),
                    txn.getStatus(),
                    createdBy
            ));
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public List<ReimbursementResponse> getReimbursementsReportData(ReimbursementReportFilterParams params) {
        Specification<Reimbursement> spec = buildReimbursementSpec(params);
        List<Reimbursement> reimbursements = reimbursementRepository.findAll(
                spec,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "claimNumber"))
        );
        return reimbursements.stream().map(ReimbursementResponse::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public byte[] generateReimbursementCsv(ReimbursementReportFilterParams params) {
        Specification<Reimbursement> spec = buildReimbursementSpec(params);
        List<Reimbursement> reimbursements = reimbursementRepository.findAll(
                spec,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "claimNumber"))
        );

        StringBuilder sb = new StringBuilder();
        // Column headers
        sb.append(CsvExportUtil.buildCsvRow(
                "Claim #",
                "Transaction #",
                "Date",
                "Claimant",
                "Category",
                "Amount",
                "Status",
                "Rejection Reason",
                "Created At",
                "Updated At"
        ));

        for (Reimbursement r : reimbursements) {
            Transaction txn = r.getTransaction();
            String txnNumber = txn != null ? txn.getTransactionNumber() : "";
            String date = txn != null && txn.getTransactionDate() != null ? txn.getTransactionDate().toString() : "";
            String claimant = r.getClaimant() != null ? r.getClaimant().getFullName() : "";
            String category = (txn != null && txn.getCategory() != null) ? txn.getCategory().getName() : "";
            Object amount = txn != null ? txn.getAmount() : "";
            String reason = r.getRejectionReason() != null ? r.getRejectionReason() : "";

            sb.append(CsvExportUtil.buildCsvRow(
                    r.getClaimNumber(),
                    txnNumber,
                    date,
                    claimant,
                    category,
                    amount,
                    r.getStatus(),
                    reason,
                    r.getCreatedAt(),
                    r.getUpdatedAt()
            ));
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private Specification<Transaction> buildTransactionSpec(TransactionReportFilterParams params) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (params != null) {
                if (params.getStartDate() != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("transactionDate"), params.getStartDate()));
                }
                if (params.getEndDate() != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("transactionDate"), params.getEndDate()));
                }
                if (params.getType() != null) {
                    predicates.add(cb.equal(root.get("transactionType"), params.getType()));
                }
                if (params.getCategoryId() != null) {
                    predicates.add(cb.equal(root.get("category").get("id"), params.getCategoryId()));
                }
                if (params.getPaymentMode() != null && !params.getPaymentMode().isBlank()) {
                    predicates.add(cb.equal(
                            cb.upper(root.get("paymentMode").get("code")),
                            params.getPaymentMode().trim().toUpperCase()
                    ));
                }
                if (params.getStatus() != null) {
                    predicates.add(cb.equal(root.get("status"), params.getStatus()));
                } else if (params.getIncludeArchived() == null || !params.getIncludeArchived()) {
                    // Default to excluding archived transactions
                    predicates.add(cb.notEqual(root.get("status"), TransactionStatus.ARCHIVED));
                }
            } else {
                predicates.add(cb.notEqual(root.get("status"), TransactionStatus.ARCHIVED));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<Reimbursement> buildReimbursementSpec(ReimbursementReportFilterParams params) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (params != null) {
                if (params.getStartDate() != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("transaction").get("transactionDate"), params.getStartDate()));
                }
                if (params.getEndDate() != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("transaction").get("transactionDate"), params.getEndDate()));
                }
                if (params.getStatus() != null) {
                    predicates.add(cb.equal(root.get("status"), params.getStatus()));
                }
                if (params.getClaimantId() != null) {
                    predicates.add(cb.equal(root.get("claimant").get("id"), params.getClaimantId()));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
