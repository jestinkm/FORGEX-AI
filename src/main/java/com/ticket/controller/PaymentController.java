package com.ticket.controller;

import com.ticket.model.dto.ApiResponse;
import com.ticket.model.dto.PaymentProcessRequest;
import com.ticket.model.dto.PaymentResponse;
import com.ticket.model.dto.PaymentWebhookRequest;
import com.ticket.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "Payment processing with strict idempotency and webhook callbacks")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/process")
    @Operation(summary = "Process order payment", description = "Executes payment transaction with idempotency key guarantee to avoid duplicate charges.")
    public ResponseEntity<ApiResponse<PaymentResponse>> processPayment(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Parameter(hidden = true) @RequestHeader(value = "X-Admission-Token", required = false) String admissionToken,
            @Valid @RequestBody PaymentProcessRequest request) {

        PaymentResponse response = paymentService.processPayment(request, idempotencyKey);
        String message = response.isDuplicateRequest()
                ? "Idempotent payment retrieved (already processed)"
                : "Payment processed successfully";

        return ResponseEntity.ok(ApiResponse.ok(message, response));
    }

    @PostMapping("/webhook")
    @Operation(summary = "Payment gateway webhook", description = "Simulated webhook callback from external payment provider")
    public ResponseEntity<ApiResponse<PaymentResponse>> handleWebhook(@Valid @RequestBody PaymentWebhookRequest request) {
        PaymentResponse response = paymentService.handleWebhook(request);
        return ResponseEntity.ok(ApiResponse.ok("Webhook processed", response));
    }
}
