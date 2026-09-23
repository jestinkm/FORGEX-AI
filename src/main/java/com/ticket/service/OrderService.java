package com.ticket.service;

import com.ticket.exception.InventoryUnavailableException;
import com.ticket.exception.PaymentProcessingException;
import com.ticket.exception.ResourceNotFoundException;
import com.ticket.model.dto.HoldTicketResponse;
import com.ticket.model.dto.OrderResponse;
import com.ticket.model.entity.Event;
import com.ticket.model.entity.Order;
import com.ticket.model.entity.Payment;
import com.ticket.model.entity.User;
import com.ticket.model.enums.EventStatus;
import com.ticket.model.enums.OrderStatus;
import com.ticket.model.enums.PaymentStatus;
import com.ticket.model.entity.BlockchainBlock;
import com.ticket.repository.BlockchainBlockRepository;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import com.ticket.repository.PaymentRepository;
import com.ticket.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final InventoryService inventoryService;
    private final QueueService queueService;
    private final MetricsService metricsService;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ActivityLogService activityLogService;
    private final EmailService emailService;
    private final BlockchainService blockchainService;
    private final BlockchainBlockRepository blockchainBlockRepository;

    @Value("${app.order.hold-ttl-seconds:600}")
    private long holdTtlSeconds;

    private static final BigDecimal DEFAULT_TICKET_PRICE = new BigDecimal("1.00");
    public static final String REDIS_HOLD_PREFIX = "ticket:hold:";

    public HoldTicketResponse holdTickets(UUID userId, UUID eventId, int ticketCount) {
        return holdTickets(userId, eventId, ticketCount, null);
    }

    public HoldTicketResponse holdTickets(UUID userId, UUID eventId, int ticketCount, String selectedSeats) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));

        if (event.getStatus() != EventStatus.ACTIVE) {
            throw new InventoryUnavailableException("Event is currently not active for ticket bookings.");
        }

        // 1. Optimistic locking hold on inventory with retry
        inventoryService.holdTicketsWithRetry(eventId, ticketCount);

        // 2. Compute hold duration and price
        Instant now = Instant.now();
        Instant expiresAt = now.plus(holdTtlSeconds, ChronoUnit.SECONDS);
        BigDecimal totalAmount = DEFAULT_TICKET_PRICE.multiply(BigDecimal.valueOf(ticketCount));

        // 3. Create Pending Order record with selected seats
        Order order = Order.builder()
                .user(user)
                .event(event)
                .ticketCount(ticketCount)
                .seatNumbers(selectedSeats)
                .totalAmount(totalAmount)
                .status(OrderStatus.PENDING)
                .holdExpiresAt(expiresAt)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Order savedOrder = orderRepository.save(order);

        // 4. Store hold session in Redis with TTL for fast lookups (with fallback)
        String holdKey = REDIS_HOLD_PREFIX + savedOrder.getId();
        try {
            redisTemplate.opsForValue().set(
                    holdKey,
                    String.format("%s:%s:%d", userId, eventId, ticketCount),
                    Duration.ofSeconds(holdTtlSeconds)
            );
        } catch (Exception e) {
            log.debug("Redis unreachable for order hold cache, proceeding with database record: {}", e.getMessage());
        }

        metricsService.incrementOrdersCreated();
        log.info("Held {} tickets (Seats: {}) for user {} on event {}. Order ID: {}, Expires at: {}",
                ticketCount, selectedSeats, userId, eventId, savedOrder.getId(), expiresAt);

        activityLogService.recordActivity(
                userId,
                user.getEmail(),
                "TICKETS_HELD",
                "Held " + ticketCount + " ticket(s) (Seats: " + (selectedSeats != null ? selectedSeats : "Auto-allocated") +
                        ") for " + event.getName() + " (Order " + savedOrder.getId().toString().substring(0, 8) + " - ₹" + totalAmount + ")",
                "SUCCESS",
                null
        );

        return HoldTicketResponse.builder()
                .orderId(savedOrder.getId())
                .eventId(eventId)
                .userId(userId)
                .ticketCount(ticketCount)
                .seatNumbers(selectedSeats)
                .totalAmount(totalAmount)
                .status(savedOrder.getStatus())
                .holdExpiresAt(expiresAt)
                .expiresInSeconds(holdTtlSeconds)
                .build();
    }

    @Transactional
    public OrderResponse confirmOrder(UUID orderId, UUID paymentId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (order.getStatus() == OrderStatus.CONFIRMED) {
            return mapToOrderResponse(order);
        }

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new InventoryUnavailableException("Order cannot be confirmed. Current status: " + order.getStatus());
        }

        if (order.getHoldExpiresAt() != null && order.getHoldExpiresAt().isBefore(Instant.now())) {
            order.setStatus(OrderStatus.EXPIRED);
            orderRepository.save(order);
            inventoryService.releaseHeldTickets(order.getEvent().getId(), order.getTicketCount());
            throw new InventoryUnavailableException("Order hold period has expired. Tickets have been released.");
        }

        // Validate payment
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment record not found: " + paymentId));

        if (!payment.getOrder().getId().equals(orderId)) {
            throw new PaymentProcessingException("Payment does not match the specified order.");
        }

        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            throw new PaymentProcessingException("Payment is not in SUCCESS status. Current status: " + payment.getStatus());
        }

        // Finalize order & inventory
        order.setStatus(OrderStatus.CONFIRMED);
        Order confirmedOrder = orderRepository.save(order);

        inventoryService.confirmSoldTickets(order.getEvent().getId(), order.getTicketCount());

        // Invalidate Redis hold key & admission token
        try {
            redisTemplate.delete(REDIS_HOLD_PREFIX + orderId);
        } catch (Exception ignored) {}
        queueService.invalidateAdmissionToken(order.getEvent().getId(), order.getUser().getId());

        metricsService.incrementOrdersConfirmed();
        log.info("Successfully confirmed Order {} for user {}. Total tickets: {}",
                orderId, order.getUser().getId(), order.getTicketCount());

        activityLogService.recordActivity(
                order.getUser().getId(),
                order.getUser().getEmail(),
                "ORDER_CONFIRMED",
                "Booking confirmed: " + order.getTicketCount() + " ticket(s) issued for " + order.getEvent().getName() + " (Order " + orderId.toString().substring(0, 8) + " - ₹" + order.getTotalAmount() + ")",
                "SUCCESS",
                null
        );

        // Automatically dispatch booking confirmation email to customer
        try {
            emailService.sendBookingConfirmationEmail(confirmedOrder);
        } catch (Exception e) {
            log.warn("Non-fatal: Email dispatch encountered an issue: {}", e.getMessage());
        }

        // Automatically mine and mint on-chain Blockchain block for seat booking
        try {
            blockchainService.mineSeatBookingBlock(confirmedOrder, payment);
        } catch (Exception e) {
            log.warn("Non-fatal: Blockchain seat minting encountered an issue: {}", e.getMessage());
        }

        return mapToOrderResponse(confirmedOrder);
    }

    @Transactional
    public int releaseExpiredOrders() {
        Instant now = Instant.now();
        List<Order> expiredOrders = orderRepository.findExpiredPendingOrders(OrderStatus.PENDING, now);

        if (expiredOrders.isEmpty()) {
            return 0;
        }

        log.info("Found {} expired pending orders to release back to inventory.", expiredOrders.size());
        int releasedCount = 0;

        for (Order order : expiredOrders) {
            try {
                order.setStatus(OrderStatus.EXPIRED);
                orderRepository.save(order);
                inventoryService.releaseHeldTickets(order.getEvent().getId(), order.getTicketCount());
                try {
                    redisTemplate.delete(REDIS_HOLD_PREFIX + order.getId());
                } catch (Exception ignored) {}
                activityLogService.recordActivity(
                        order.getUser().getId(),
                        order.getUser().getEmail(),
                        "ORDER_EXPIRED",
                        "Hold expired on order " + order.getId().toString().substring(0, 8) + "; " + order.getTicketCount() + " seat(s) released.",
                        "WARNING",
                        null
                );
                releasedCount++;
            } catch (Exception e) {
                log.error("Failed releasing expired order {}: {}", order.getId(), e.getMessage());
            }
        }

        return releasedCount;
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        return mapToOrderResponse(order);
    }

    private OrderResponse mapToOrderResponse(Order order) {
        Optional<BlockchainBlock> blockOpt = blockchainBlockRepository.findByOrderId(order.getId().toString());

        OrderResponse.OrderResponseBuilder builder = OrderResponse.builder()
                .orderId(order.getId())
                .userId(order.getUser().getId())
                .eventId(order.getEvent().getId())
                .eventName(order.getEvent().getName())
                .ticketCount(order.getTicketCount())
                .seatNumbers(order.getSeatNumbers())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt());

        blockOpt.ifPresent(block -> {
            builder.blockHash(block.getBlockHash())
                    .blockIndex(block.getBlockIndex())
                    .tokenId(block.getTokenId())
                    .contractAddress(block.getContractAddress())
                    .buyerWallet(block.getBuyerWallet());
        });

        return builder.build();
    }
}
