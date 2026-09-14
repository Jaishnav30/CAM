package com.cams.modules.audit.dto;

import com.cams.modules.audit.model.AuditLog;
import com.cams.modules.user.dto.UserSummaryResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponse {

    private UUID id;
    private String entityType;
    private UUID entityId;
    private String action;
    private UserSummaryResponse performedBy;
    private String clientIp;
    private String oldValues;
    private String newValues;
    private String changeSummary;
    private Instant createdAt;

    public static AuditLogResponse fromEntity(AuditLog log) {
        if (log == null) {
            return null;
        }
        return AuditLogResponse.builder()
                .id(log.getId())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .action(log.getAction())
                .performedBy(log.getPerformedBy() != null ? UserSummaryResponse.fromEntity(log.getPerformedBy()) : null)
                .clientIp(log.getClientIp())
                .oldValues(log.getOldValues())
                .newValues(log.getNewValues())
                .changeSummary(log.getChangeSummary())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
