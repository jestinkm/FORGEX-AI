package com.ticket.model.dto;

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
public class PaymentProcessRequest {
    @NotNull(message = "Order ID is required")
    private UUID orderId;

    @Builder.Default
    private String paymentMethod = "CREDIT_CARD";

    private String upiId;

    private String utrNumber;
}
