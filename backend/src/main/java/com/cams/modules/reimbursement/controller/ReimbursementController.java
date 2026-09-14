package com.cams.modules.reimbursement.controller;

import com.cams.common.ApiResponse;
import com.cams.common.IpUtils;
import com.cams.common.PagedResponse;
import com.cams.modules.reimbursement.dto.RejectReimbursementRequest;
import com.cams.modules.reimbursement.dto.ReimbursementFilterParams;
import com.cams.modules.reimbursement.dto.ReimbursementResponse;
import com.cams.modules.reimbursement.dto.SubmitReimbursementRequest;
import com.cams.modules.reimbursement.service.ReimbursementService;
import com.cams.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reimbursements")
@RequiredArgsConstructor
public class ReimbursementController {

    private final ReimbursementService reimbursementService;

    @PostMapping
    @PreAuthorize("hasAuthority('reimbursements:submit')")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> submitClaim(
            @Valid @RequestBody SubmitReimbursementRequest req,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        ReimbursementResponse response = reimbursementService.submitClaim(req, currentUser, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Reimbursement claim submitted successfully", response));
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('reimbursements:read', 'reimbursements:submit')")
    public ResponseEntity<ApiResponse<PagedResponse<ReimbursementResponse>>> getClaims(
            ReimbursementFilterParams params,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        PagedResponse<ReimbursementResponse> response = reimbursementService.getClaims(params, pageable, currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('reimbursements:read', 'reimbursements:submit')")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> getClaimById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        ReimbursementResponse response = reimbursementService.getClaimById(id, currentUser);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('reimbursements:approve')")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> approveClaim(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        ReimbursementResponse response = reimbursementService.approveClaim(id, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Reimbursement claim approved successfully", response));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('reimbursements:review') and (hasRole('ADMIN') or hasRole('ACCOUNTANT'))")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> rejectClaim(
            @PathVariable UUID id,
            @Valid @RequestBody RejectReimbursementRequest req,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        ReimbursementResponse response = reimbursementService.rejectClaim(id, req, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Reimbursement claim rejected", response));
    }

    @PostMapping("/{id}/resubmit")
    @PreAuthorize("hasAuthority('reimbursements:submit')")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> resubmitClaim(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        ReimbursementResponse response = reimbursementService.resubmitClaim(id, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Reimbursement claim resubmitted successfully", response));
    }

    @PostMapping("/{id}/mark-reimbursed")
    @PreAuthorize("hasAuthority('reimbursements:mark_paid')")
    public ResponseEntity<ApiResponse<ReimbursementResponse>> markReimbursed(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        ReimbursementResponse response = reimbursementService.markReimbursed(id, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("Reimbursement claim marked as reimbursed", response));
    }
}
