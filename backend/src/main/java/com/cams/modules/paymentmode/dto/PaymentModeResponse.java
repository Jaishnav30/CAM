package com.cams.modules.paymentmode.dto;

import com.cams.modules.paymentmode.model.PaymentMode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentModeResponse {

    private UUID id;
    private String code;
    private String name;
    private String description;
    private boolean isActive;

    public static PaymentModeResponse fromEntity(PaymentMode paymentMode) {
        return PaymentModeResponse.builder()
                .id(paymentMode.getId())
                .code(paymentMode.getCode())
                .name(paymentMode.getName())
                .description(paymentMode.getDescription())
                .isActive(paymentMode.isActive())
                .build();
    }
}
