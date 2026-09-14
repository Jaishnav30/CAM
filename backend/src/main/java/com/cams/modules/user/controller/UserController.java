package com.cams.modules.user.controller;

import com.cams.common.ApiResponse;
import com.cams.modules.user.dto.UserProfileStatsDto;
import com.cams.modules.user.service.UserService;
import com.cams.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me/profile")
    public ResponseEntity<ApiResponse<UserProfileStatsDto>> getMyProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        UserProfileStatsDto profile = userService.getProfileStats(principal.getId(), principal);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @GetMapping("/{id}/profile")
    @PreAuthorize("hasAuthority('users:read') or hasRole('ADMIN') or #id == principal.id")
    public ResponseEntity<ApiResponse<UserProfileStatsDto>> getUserProfile(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        UserProfileStatsDto profile = userService.getProfileStats(id, principal);
        return ResponseEntity.ok(ApiResponse.success(profile));
    }
}
