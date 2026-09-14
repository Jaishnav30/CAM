package com.cams.modules.audit.repository;

import com.cams.modules.audit.dto.AuditLogFilterParams;
import com.cams.modules.audit.model.AuditLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

public class AuditLogSpecification {

    public static Specification<AuditLog> build(AuditLogFilterParams params) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (params != null) {
                if (params.getEntityType() != null && !params.getEntityType().isBlank()) {
                    predicates.add(cb.equal(
                            cb.upper(root.get("entityType")),
                            params.getEntityType().trim().toUpperCase()
                    ));
                }

                if (params.getEntityId() != null) {
                    predicates.add(cb.equal(root.get("entityId"), params.getEntityId()));
                }

                if (params.getAction() != null && !params.getAction().isBlank()) {
                    predicates.add(cb.equal(
                            cb.upper(root.get("action")),
                            params.getAction().trim().toUpperCase()
                    ));
                }

                if (params.getPerformedById() != null) {
                    predicates.add(cb.equal(root.get("performedBy").get("id"), params.getPerformedById()));
                }

                if (params.getStartDate() != null) {
                    predicates.add(cb.greaterThanOrEqualTo(
                            root.get("createdAt"),
                            params.getStartDate().atStartOfDay(ZoneOffset.UTC).toInstant()
                    ));
                }

                if (params.getEndDate() != null) {
                    predicates.add(cb.lessThan(
                            root.get("createdAt"),
                            params.getEndDate().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()
                    ));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
