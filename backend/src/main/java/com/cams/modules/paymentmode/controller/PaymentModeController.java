package com.cams.modules.paymentmode.controller;

import com.cams.common.ApiResponse;
import com.cams.modules.paymentmode.dto.PaymentModeResponse;
import com.cams.modules.paymentmode.service.PaymentModeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payment-modes")
@RequiredArgsConstructor
public class PaymentModeController {

    private final PaymentModeService paymentModeService;

    @GetMapping
    @PreAuthorize("hasAuthority('payment_modes:read')")
    public ResponseEntity<ApiResponse<List<PaymentModeResponse>>> getActivePaymentModes() {
        List<PaymentModeResponse> modes = paymentModeService.getActivePaymentModes();
        return ResponseEntity.ok(ApiResponse.success(modes));
    }
}
