package com.ticket.service;

import com.ticket.exception.PaymentProcessingException;
import com.ticket.model.enums.PaymentStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.UUID;

@Slf4j
@Component
public class MockPaymentGateway {

    private final SecureRandom random = new SecureRandom();

    @Value("${app.payment.mock-failure-rate:0.10}")
    private double failureRate;

    @Value("${app.payment.mock-timeout-rate:0.05}")
    private double timeoutRate;

    @Value("${app.payment.simulate-latency-ms:200}")
    private long simulateLatencyMs;

    public record GatewayResult(PaymentStatus status, String providerReference, String message) {}

    public GatewayResult processTransaction(UUID orderId, BigDecimal amount, String idempotencyKey) {
        // Simulate network latency
        if (simulateLatencyMs > 0) {
            try {
                Thread.sleep(simulateLatencyMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new PaymentProcessingException("Payment gateway processing was interrupted");
            }
        }

        double roll = random.nextDouble();

        // 1. Simulate gateway timeout
        if (roll < timeoutRate) {
            log.warn("Mock Gateway: Simulated timeout for order {}, idempotencyKey {}", orderId, idempotencyKey);
            throw new PaymentProcessingException("Gateway timeout while contacting banking network. Please retry.");
        }

        // 2. Simulate payment decline/failure
        if (roll < (timeoutRate + failureRate)) {
            log.warn("Mock Gateway: Simulated payment decline for order {}, idempotencyKey {}", orderId, idempotencyKey);
            return new GatewayResult(PaymentStatus.FAILED, "declined_" + UUID.randomUUID(), "Payment declined by issuing bank.");
        }

        // 3. Successful payment
        String providerRef = "ch_live_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        log.info("Mock Gateway: Successfully processed ${} for order {}. Ref: {}", amount, orderId, providerRef);
        return new GatewayResult(PaymentStatus.SUCCESS, providerRef, "Payment authorized and captured.");
    }
}
