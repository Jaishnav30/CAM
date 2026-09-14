package com.cams.modules.role.controller;

import com.cams.common.ApiResponse;
import com.cams.common.IpUtils;
import com.cams.modules.role.dto.RbacMatrixResponse;
import com.cams.modules.role.dto.UpdateRbacMatrixRequest;
import com.cams.modules.role.service.RbacService;
import com.cams.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/rbac")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class RbacController {

    private final RbacService rbacService;

    @GetMapping("/matrix")
    public ResponseEntity<ApiResponse<RbacMatrixResponse>> getRbacMatrix() {
        RbacMatrixResponse matrix = rbacService.getRbacMatrix();
        return ResponseEntity.ok(ApiResponse.success(matrix));
    }

    @PutMapping("/matrix")
    public ResponseEntity<ApiResponse<RbacMatrixResponse>> updateRbacMatrix(
            @Valid @RequestBody UpdateRbacMatrixRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser,
            HttpServletRequest servletRequest
    ) {
        String clientIp = IpUtils.getClientIp(servletRequest);
        RbacMatrixResponse matrix = rbacService.updateRbacMatrix(request, currentUser, clientIp);
        return ResponseEntity.ok(ApiResponse.success("RBAC permissions matrix updated successfully", matrix));
    }
}
