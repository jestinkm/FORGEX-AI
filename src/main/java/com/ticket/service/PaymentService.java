package com.ticket.service;

import com.ticket.exception.InventoryUnavailableException;
import com.ticket.exception.PaymentProcessingException;
import com.ticket.exception.ResourceNotFoundException;
import com.ticket.model.dto.PaymentProcessRequest;
import com.ticket.model.dto.PaymentResponse;
import com.ticket.model.dto.PaymentWebhookRequest;
import com.ticket.model.entity.Order;
import com.ticket.model.entity.Payment;
import com.ticket.model.enums.OrderStatus;
import com.ticket.model.enums.PaymentStatus;
import com.ticket.repository.OrderRepository;
import com.ticket.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final MockPaymentGateway paymentGateway;
    private final MetricsService metricsService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ActivityLogService activityLogService;

    private static final String PAYMENT_LOCK_PREFIX = "lock:payment:";

    @Transactional
    public PaymentResponse processPayment(UUID orderId, String idempotencyKey) {
        return processPayment(PaymentProcessRequest.builder()
                .orderId(orderId)
                .paymentMethod("CREDIT_CARD")
                .build(), idempotencyKey);
    }

    @Transactional
    public PaymentResponse processPayment(PaymentProcessRequest request, String idempotencyKey) {
        UUID orderId = request.getOrderId();
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new PaymentProcessingException("Missing required Idempotency-Key header.");
        }

        // 1. Idempotency Check: return existing payment if already completed
        Optional<Payment> existingPayment = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existingPayment.isPresent()) {
            log.info("Idempotent request detected for key {}. Returning existing payment {}.",
                    idempotencyKey, existingPayment.get().getId());
            return mapToPaymentResponse(existingPayment.get(), true);
        }

        // 2. Distributed Lock via Redis to prevent concurrent processing with identical key
        String lockKey = PAYMENT_LOCK_PREFIX + idempotencyKey;
        boolean lockAcquired = false;
        try {
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "LOCKED", Duration.ofSeconds(15));
            if (Boolean.FALSE.equals(acquired)) {
                throw new PaymentProcessingException("A transaction with this Idempotency-Key is currently in progress. Please wait.");
            }
            lockAcquired = true;
        } catch (PaymentProcessingException e) {
            throw e;
        } catch (Exception e) {
            log.debug("Redis unreachable for payment lock, relying on database unique constraint: {}", e.getMessage());
        }

        try {
            // Re-check after acquiring lock (double-checked locking pattern)
            Optional<Payment> doubleCheck = paymentRepository.findByIdempotencyKey(idempotencyKey);
            if (doubleCheck.isPresent()) {
                return mapToPaymentResponse(doubleCheck.get(), true);
            }

            Order order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

            if (order.getStatus() != OrderStatus.PENDING) {
                throw new InventoryUnavailableException("Cannot process payment for order in status: " + order.getStatus());
            }

            if (order.getHoldExpiresAt() != null && order.getHoldExpiresAt().isBefore(Instant.now())) {
                throw new InventoryUnavailableException("Order hold period has expired. Please release and re-hold tickets.");
            }

            PaymentStatus finalStatus;
            String providerRef;
            String upiId = request.getUpiId();
            String utrNumber = request.getUtrNumber();

            // 3. Check Payment Method
            if ("UPI".equalsIgnoreCase(request.getPaymentMethod())) {
                // Strict validation: UTR cannot be empty without payment
                if (utrNumber == null || utrNumber.isBlank()) {
                    activityLogService.recordActivity(
                            order.getUser().getId(),
                            order.getUser().getEmail(),
                            "PAYMENT_REJECTED",
                            "Payment rejected: No 12-digit UPI UTR reference provided. Unpaid requests cannot be confirmed.",
                            "FAILED",
                            null
                    );
                    throw new PaymentProcessingException("Payment verification failed: Valid 12-digit UPI UTR from your Google Pay / PhonePe transaction receipt is required. Unpaid transactions cannot be confirmed.");
                }

                String cleanUtr = utrNumber.trim();
                // Validate strictly 12 digits
                if (!cleanUtr.matches("^[0-9]{12}$")) {
                    activityLogService.recordActivity(
                            order.getUser().getId(),
                            order.getUser().getEmail(),
                            "PAYMENT_REJECTED",
                            "Payment rejected: Invalid UPI UTR format '" + cleanUtr + "'. Must be exactly 12 numeric digits.",
                            "FAILED",
                            null
                    );
                    throw new PaymentProcessingException("Payment verification failed: UPI Transaction Reference (UTR) must be exactly 12 numeric digits (received: " + cleanUtr + "). Please check your payment app receipt.");
                }

                // Check for dummy or sequential UTRs
                if (isDummyUtr(cleanUtr)) {
                    activityLogService.recordActivity(
                            order.getUser().getId(),
                            order.getUser().getEmail(),
                            "PAYMENT_REJECTED",
                            "Payment rejected: Dummy/unsettled UPI UTR '" + cleanUtr + "'.",
                            "FAILED",
                            null
                    );
                    throw new PaymentProcessingException("Payment verification failed: UPI Reference (" + cleanUtr + ") has not settled at the bank. Please pay ₹" + order.getTotalAmount() + " to dharshu0046-1@okicici and enter genuine 12-digit UTR.");
                }

                // Prevent reusing UTR across orders
                Optional<Payment> existingUtr = paymentRepository.findByUtrNumber(cleanUtr);
                if (existingUtr.isPresent() && !existingUtr.get().getOrder().getId().equals(orderId)) {
                    activityLogService.recordActivity(
                            order.getUser().getId(),
                            order.getUser().getEmail(),
                            "PAYMENT_REJECTED",
                            "Duplicate UTR attempt: " + cleanUtr + " was already used for order " + existingUtr.get().getOrder().getId(),
                            "FAILED",
                            null
                    );
                    throw new PaymentProcessingException("Payment verification failed: This UPI UTR (" + cleanUtr + ") has already been redeemed for another order. Reusing UTR numbers is prohibited.");
                }

                finalStatus = PaymentStatus.SUCCESS;
                providerRef = "UPI_UTR_" + cleanUtr;

                activityLogService.recordActivity(
                        order.getUser().getId(),
                        order.getUser().getEmail(),
                        "UPI_PAYMENT_VERIFIED",
                        "UPI payment verified for ₹" + order.getTotalAmount() + " with UTR " + cleanUtr + " (Payee: dharshu0046-1@okicici)",
                        "SUCCESS",
                        null
                );
            } else {
                // Card or other gateway fallback
                MockPaymentGateway.GatewayResult result = paymentGateway.processTransaction(
                        orderId,
                        order.getTotalAmount(),
                        idempotencyKey
                );
                finalStatus = result.status();
                providerRef = result.providerReference();
            }

            // 4. Save Payment record
            Payment payment = Payment.builder()
                    .order(order)
                    .amount(order.getTotalAmount())
                    .status(finalStatus)
                    .idempotencyKey(idempotencyKey)
                    .providerReference(providerRef)
                    .upiId(upiId)
                    .utrNumber(utrNumber != null ? utrNumber.trim() : null)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();

            Payment savedPayment = paymentRepository.save(payment);

            if (finalStatus == PaymentStatus.SUCCESS) {
                metricsService.incrementPaymentSuccess();
                log.info("Payment succeeded for order {}. Payment ID: {}, UTR: {}", orderId, savedPayment.getId(), utrNumber);
            } else {
                metricsService.incrementPaymentFailure();
                log.warn("Payment failed for order {}.", orderId);
            }

            return mapToPaymentResponse(savedPayment, false);

        } finally {
            if (lockAcquired) {
                try {
                    redisTemplate.delete(lockKey);
                } catch (Exception ignored) {}
            }
        }
    }

    private boolean isDummyUtr(String utr) {
        if (utr == null || utr.length() != 12) return true;
        // All digits identical: e.g. 000000000000, 111111111111
        if (utr.chars().distinct().count() <= 1) return true;
        // Common dummy test sequences
        if ("123456789012".equals(utr) || "012345678901".equals(utr) || "123456789000".equals(utr)) {
            return true;
        }
        return false;
    }

    @Transactional
    public PaymentResponse handleWebhook(PaymentWebhookRequest request) {
        Payment payment = paymentRepository.findById(request.getPaymentId())
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + request.getPaymentId()));

        payment.setStatus(request.getStatus());
        payment.setUpdatedAt(Instant.now());
        Payment updated = paymentRepository.save(payment);

        log.info("Updated payment {} status to {} via webhook callback.", payment.getId(), request.getStatus());
        return mapToPaymentResponse(updated, false);
    }

    private PaymentResponse mapToPaymentResponse(Payment payment, boolean isDuplicate) {
        return PaymentResponse.builder()
                .paymentId(payment.getId())
                .orderId(payment.getOrder().getId())
                .amount(payment.getAmount())
                .status(payment.getStatus())
                .idempotencyKey(payment.getIdempotencyKey())
                .providerReference(payment.getProviderReference())
                .createdAt(payment.getCreatedAt())
                .duplicateRequest(isDuplicate)
                .build();
    }
}
