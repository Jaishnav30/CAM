package com.cams.modules.transaction.repository;

import com.cams.modules.transaction.dto.TransactionFilterParams;
import com.cams.modules.transaction.model.Transaction;
import com.cams.modules.transaction.model.TransactionStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class TransactionSpecification {

    public static Specification<Transaction> withFilters(
            TransactionFilterParams params,
            UUID scopedUserId,
            boolean isScopedToUser
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Mandatory User Scoping for MEMBER (IDOR prevention)
            if (isScopedToUser) {
                predicates.add(cb.equal(root.get("createdBy").get("id"), scopedUserId));
            } else if (params != null && params.getCreatedById() != null) {
                // Privileged role filtered by specific created_by
                predicates.add(cb.equal(root.get("createdBy").get("id"), params.getCreatedById()));
            }

            if (params != null) {
                // 2. Date Range
                if (params.getStartDate() != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("transactionDate"), params.getStartDate()));
                }
                if (params.getEndDate() != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("transactionDate"), params.getEndDate()));
                }

                // 3. Transaction Type (IN / OUT)
                if (params.getType() != null) {
                    predicates.add(cb.equal(root.get("transactionType"), params.getType()));
                }

                // 4. Category
                if (params.getCategoryId() != null) {
                    predicates.add(cb.equal(root.get("category").get("id"), params.getCategoryId()));
                }

                // 5. Payment Mode
                if (params.getPaymentMode() != null && !params.getPaymentMode().isBlank()) {
                    predicates.add(cb.equal(cb.upper(root.get("paymentMode").get("code")), params.getPaymentMode().trim().toUpperCase()));
                }

                // 6. Status & Archive Handling
                if (params.getStatus() != null) {
                    predicates.add(cb.equal(root.get("status"), params.getStatus()));
                } else if (!Boolean.TRUE.equals(params.getIncludeArchived())) {
                    // Exclude ARCHIVED by default from standard listings
                    predicates.add(cb.notEqual(root.get("status"), TransactionStatus.ARCHIVED));
                }
            } else {
                // Default: Exclude ARCHIVED
                predicates.add(cb.notEqual(root.get("status"), TransactionStatus.ARCHIVED));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
