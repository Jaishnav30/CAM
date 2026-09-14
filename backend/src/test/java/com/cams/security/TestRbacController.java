package com.cams.security;

import com.cams.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/test/rbac")
public class TestRbacController {

    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> adminOnly() {
        return ResponseEntity.ok(ApiResponse.success("Admin access granted"));
    }

    @GetMapping("/accountant-only")
    @PreAuthorize("hasRole('ACCOUNTANT')")
    public ResponseEntity<ApiResponse<String>> accountantOnly() {
        return ResponseEntity.ok(ApiResponse.success("Accountant access granted"));
    }

    @GetMapping("/users-read")
    @PreAuthorize("hasAuthority('users:read')")
    public ResponseEntity<ApiResponse<String>> usersRead() {
        return ResponseEntity.ok(ApiResponse.success("users:read granted"));
    }

    @GetMapping("/transactions-create")
    @PreAuthorize("hasAuthority('transactions:create')")
    public ResponseEntity<ApiResponse<String>> transactionsCreate() {
        return ResponseEntity.ok(ApiResponse.success("transactions:create granted"));
    }
}
