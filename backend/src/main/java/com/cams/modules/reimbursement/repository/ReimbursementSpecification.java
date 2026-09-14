package com.cams.modules.reimbursement.repository;

import com.cams.modules.reimbursement.dto.ReimbursementFilterParams;
import com.cams.modules.reimbursement.model.Reimbursement;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class ReimbursementSpecification {

    public static Specification<Reimbursement> withFilters(
            ReimbursementFilterParams params,
            UUID scopedClaimantId,
            boolean isScopedToUser
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Mandatory Claimant Scoping for MEMBER (IDOR prevention)
            if (isScopedToUser) {
                predicates.add(cb.equal(root.get("claimant").get("id"), scopedClaimantId));
            } else if (params != null && params.getClaimantId() != null) {
                predicates.add(cb.equal(root.get("claimant").get("id"), params.getClaimantId()));
            }

            if (params != null) {
                // 2. Status filter
                if (params.getStatus() != null) {
                    predicates.add(cb.equal(root.get("status"), params.getStatus()));
                }

                // 3. Category ID (via transaction)
                if (params.getCategoryId() != null) {
                    predicates.add(cb.equal(root.get("transaction").get("category").get("id"), params.getCategoryId()));
                }

                // 4. Date range (via transaction date)
                if (params.getStartDate() != null) {
                    predicates.add(cb.greaterThanOrEqualTo(root.get("transaction").get("transactionDate"), params.getStartDate()));
                }
                if (params.getEndDate() != null) {
                    predicates.add(cb.lessThanOrEqualTo(root.get("transaction").get("transactionDate"), params.getEndDate()));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
