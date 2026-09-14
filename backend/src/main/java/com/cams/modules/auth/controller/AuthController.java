package com.cams.modules.auth.controller;

import com.cams.common.ApiResponse;
import com.cams.modules.auth.dto.AuthResponse;
import com.cams.modules.auth.dto.LoginRequest;
import com.cams.modules.auth.dto.RegisterRequest;
import com.cams.modules.auth.dto.SendOtpRequest;
import com.cams.modules.auth.dto.UserProfileResponse;
import com.cams.modules.auth.service.AuthService;
import com.cams.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/send-verification-otp")
    public ResponseEntity<ApiResponse<Void>> sendVerificationOtp(@Valid @RequestBody SendOtpRequest request) {
        authService.sendVerificationOtp(request);
        return ResponseEntity.ok(ApiResponse.success("Verification code sent to your email address.", null));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(ApiResponse.success("Registration submitted successfully. Your account is pending administrator approval.", null));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request,
                                                          HttpServletRequest httpRequest,
                                                          HttpServletResponse httpResponse) {
        AuthResponse response = authService.login(request, httpRequest, httpResponse);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(HttpServletRequest httpRequest,
                                                            HttpServletResponse httpResponse) {
        AuthResponse response = authService.refresh(httpRequest, httpResponse);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed successfully", response));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser(
            @AuthenticationPrincipal UserPrincipal principal) {
        UserProfileResponse response = authService.getCurrentUser(principal);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest httpRequest,
                                                   HttpServletResponse httpResponse,
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(httpRequest, httpResponse, principal);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }
}
