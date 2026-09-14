package com.cams.modules.user.controller;

import com.cams.common.ApiResponse;
import com.cams.modules.user.dto.RegistrationApprovalRequest;
import com.cams.modules.user.dto.RegistrationRejectionRequest;
import com.cams.modules.user.dto.UserRegistrationItemDto;
import com.cams.modules.user.service.UserService;
import com.cams.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping({"", "/all"})
    @PreAuthorize("hasAuthority('users:read') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserRegistrationItemDto>>> getAllUsers() {
        List<UserRegistrationItemDto> users = userService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @GetMapping("/registrations")
    @PreAuthorize("hasAuthority('users:read') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserRegistrationItemDto>>> getRegistrations(
            @RequestParam(required = false, defaultValue = "PENDING") String status) {
        List<UserRegistrationItemDto> registrations = userService.getRegistrations(status);
        return ResponseEntity.ok(ApiResponse.success(registrations));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('users:update') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserRegistrationItemDto>> approveRegistration(
            @PathVariable UUID id,
            @RequestBody(required = false) RegistrationApprovalRequest request,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {
        UserRegistrationItemDto approved = userService.approveRegistration(id, request, adminPrincipal);
        return ResponseEntity.ok(ApiResponse.success("User registration approved successfully", approved));
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('users:update') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserRegistrationItemDto>> rejectRegistration(
            @PathVariable UUID id,
            @RequestBody(required = false) RegistrationRejectionRequest request,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {
        UserRegistrationItemDto rejected = userService.rejectRegistration(id, request, adminPrincipal);
        return ResponseEntity.ok(ApiResponse.success("User registration rejected", rejected));
    }

    @PostMapping("/{id}/block")
    @PreAuthorize("hasAuthority('users:update') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserRegistrationItemDto>> blockUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {
        UserRegistrationItemDto blocked = userService.blockUser(id, adminPrincipal);
        return ResponseEntity.ok(ApiResponse.success("User blocked successfully", blocked));
    }

    @PostMapping("/{id}/unblock")
    @PreAuthorize("hasAuthority('users:update') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserRegistrationItemDto>> unblockUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {
        UserRegistrationItemDto unblocked = userService.unblockUser(id, adminPrincipal);
        return ResponseEntity.ok(ApiResponse.success("User unblocked successfully", unblocked));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('users:delete') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserRegistrationItemDto>> deleteUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal adminPrincipal) {
        UserRegistrationItemDto deleted = userService.deleteUser(id, adminPrincipal);
        return ResponseEntity.ok(ApiResponse.success("User permanently deleted", deleted));
    }
}
