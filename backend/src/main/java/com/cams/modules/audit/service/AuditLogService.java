package com.cams.modules.audit.service;

import com.cams.common.PagedResponse;
import com.cams.modules.audit.dto.AuditLogFilterParams;
import com.cams.modules.audit.dto.AuditLogResponse;
import com.cams.modules.audit.model.AuditLog;
import com.cams.modules.audit.repository.AuditLogRepository;
import com.cams.modules.audit.repository.AuditLogSpecification;
import com.cams.modules.user.model.User;
import com.cams.modules.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public PagedResponse<AuditLogResponse> getAuditLogs(AuditLogFilterParams params, Pageable pageable) {
        Pageable effectivePageable = pageable;
        if (pageable == null || pageable.getSort().isUnsorted()) {
            int pageNumber = pageable != null ? pageable.getPageNumber() : 0;
            int pageSize = pageable != null ? pageable.getPageSize() : 20;
            effectivePageable = PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        Specification<AuditLog> spec = AuditLogSpecification.build(params);
        Page<AuditLog> auditPage = auditLogRepository.findAll(spec, effectivePageable);
        return PagedResponse.of(auditPage.map(AuditLogResponse::fromEntity));
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public AuditLog recordAudit(
            String entityType,
            UUID entityId,
            String action,
            UUID performedById,
            String clientIp,
            Object oldValues,
            Object newValues,
            String changeSummary
    ) {
        String oldValuesJson = serialize(oldValues);
        String newValuesJson = serialize(newValues);

        User performedBy = null;
        if (performedById != null) {
            performedBy = userRepository.findById(performedById).orElse(null);
        }

        AuditLog auditLog = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .performedBy(performedBy)
                .clientIp(clientIp)
                .oldValues(oldValuesJson)
                .newValues(newValuesJson)
                .changeSummary(changeSummary)
                .createdAt(Instant.now())
                .build();

        AuditLog saved = auditLogRepository.save(auditLog);
        log.debug("Synchronous audit recorded for {} {} action {}", entityType, entityId, action);
        return saved;
    }

    private String serialize(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof String str) {
            return str;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("Failed to serialize audit log object: {}", e.getMessage());
            return "{\"serialization_error\": \"" + e.getMessage() + "\"}";
        }
    }
}
