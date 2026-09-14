package com.cams.modules.audit.controller;

import com.cams.common.ApiResponse;
import com.cams.common.PagedResponse;
import com.cams.modules.audit.dto.AuditLogFilterParams;
import com.cams.modules.audit.dto.AuditLogResponse;
import com.cams.modules.audit.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PagedResponse<AuditLogResponse>>> getAuditLogs(
            AuditLogFilterParams params,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        PagedResponse<AuditLogResponse> response = auditLogService.getAuditLogs(params, pageable);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
