package com.ticket.service;

import com.ticket.model.dto.PaymentResponse;
import com.ticket.model.entity.Order;
import com.ticket.model.entity.Payment;
import com.ticket.model.enums.OrderStatus;
import com.ticket.model.enums.PaymentStatus;
import com.ticket.repository.OrderRepository;
import com.ticket.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentIdempotencyTest {

    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private MockPaymentGateway paymentGateway;
    @Mock
    private MetricsService metricsService;
    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private ValueOperations<String, Object> valueOperations;

    @InjectMocks
    private PaymentService paymentService;

    private UUID orderId;
    private Order testOrder;
    private String idempotencyKey;

    @BeforeEach
    void setUp() {
        orderId = UUID.randomUUID();
        idempotencyKey = "txn-unique-12345";

        testOrder = Order.builder()
                .id(orderId)
                .totalAmount(new BigDecimal("170.00"))
                .status(OrderStatus.PENDING)
                .holdExpiresAt(Instant.now().plusSeconds(600))
                .build();
    }

    @Test
    @DisplayName("Should return existing payment and not re-process if Idempotency-Key was already recorded")
    void shouldReturnCachedPaymentWhenIdempotencyKeyRepeats() {
        Payment existingPayment = Payment.builder()
                .id(UUID.randomUUID())
                .order(testOrder)
                .amount(new BigDecimal("170.00"))
                .status(PaymentStatus.SUCCESS)
                .idempotencyKey(idempotencyKey)
                .providerReference("ch_live_existing123")
                .createdAt(Instant.now().minusSeconds(60))
                .build();

        when(paymentRepository.findByIdempotencyKey(idempotencyKey))
                .thenReturn(Optional.of(existingPayment));

        PaymentResponse response = paymentService.processPayment(orderId, idempotencyKey);

        assertThat(response).isNotNull();
        assertThat(response.isDuplicateRequest()).isTrue();
        assertThat(response.getPaymentId()).isEqualTo(existingPayment.getId());
        assertThat(response.getProviderReference()).isEqualTo("ch_live_existing123");

        // Verify gateway was NEVER called again
        verify(paymentGateway, never()).processTransaction(any(), any(), any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should acquire distributed lock and process new payment transaction when key is new")
    void shouldProcessNewPaymentWithLock() {
        when(paymentRepository.findByIdempotencyKey(idempotencyKey)).thenReturn(Optional.empty());
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(eq("lock:payment:" + idempotencyKey), eq("LOCKED"), any(Duration.class)))
                .thenReturn(true);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(testOrder));
        when(paymentGateway.processTransaction(eq(orderId), eq(new BigDecimal("170.00")), eq(idempotencyKey)))
                .thenReturn(new MockPaymentGateway.GatewayResult(PaymentStatus.SUCCESS, "ch_live_new456", "Authorized"));

        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            return p;
        });

        PaymentResponse response = paymentService.processPayment(orderId, idempotencyKey);

        assertThat(response).isNotNull();
        assertThat(response.isDuplicateRequest()).isFalse();
        assertThat(response.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(response.getProviderReference()).isEqualTo("ch_live_new456");

        verify(paymentGateway).processTransaction(eq(orderId), any(), eq(idempotencyKey));
        verify(paymentRepository).save(any(Payment.class));
        verify(redisTemplate).delete("lock:payment:" + idempotencyKey);
        verify(metricsService).incrementPaymentSuccess();
    }
}
