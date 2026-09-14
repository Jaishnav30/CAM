package com.cams.modules.analytics.controller;

import com.cams.common.ApiResponse;
import com.cams.modules.analytics.dto.AnalyticsBreakdownResponse;
import com.cams.modules.analytics.dto.AnalyticsFilterParams;
import com.cams.modules.analytics.dto.AnalyticsSummaryResponse;
import com.cams.modules.analytics.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('analytics:read')")
    public ResponseEntity<ApiResponse<AnalyticsSummaryResponse>> getSummary(AnalyticsFilterParams params) {
        AnalyticsSummaryResponse response = analyticsService.getSummary(params);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/breakdowns")
    @PreAuthorize("hasAuthority('analytics:read')")
    public ResponseEntity<ApiResponse<AnalyticsBreakdownResponse>> getBreakdowns(AnalyticsFilterParams params) {
        AnalyticsBreakdownResponse response = analyticsService.getBreakdowns(params);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
