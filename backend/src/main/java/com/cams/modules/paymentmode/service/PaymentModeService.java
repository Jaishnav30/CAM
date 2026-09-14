package com.cams.modules.paymentmode.service;

import com.cams.exception.ResourceNotFoundException;
import com.cams.modules.paymentmode.dto.PaymentModeResponse;
import com.cams.modules.paymentmode.model.PaymentMode;
import com.cams.modules.paymentmode.repository.PaymentModeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentModeService {

    private final PaymentModeRepository paymentModeRepository;

    @Transactional(readOnly = true)
    public List<PaymentModeResponse> getActivePaymentModes() {
        return paymentModeRepository.findByIsActiveTrueOrderByCodeAsc()
                .stream()
                .map(PaymentModeResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PaymentMode getActivePaymentModeByCode(String code) {
        PaymentMode mode = paymentModeRepository.findByCodeIgnoreCase(code)
                .orElseThrow(() -> new ResourceNotFoundException("Payment mode not found with code: " + code));
        if (!mode.isActive()) {
            throw new IllegalArgumentException("Payment mode '" + code + "' is inactive and cannot be used");
        }
        return mode;
    }
}
