package com.ticket.model.dto;

import com.ticket.model.enums.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentWebhookRequest {
    @NotNull
    private UUID paymentId;

    @NotNull
    private UUID orderId;

    @NotNull
    private PaymentStatus status;

    private String signature;
}
