package com.ticket.model.dto;

import com.ticket.model.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminBookingResponse {
    private UUID orderId;
    private UUID userId;
    private String customerEmail;
    private String customerName;
    private UUID eventId;
    private String eventName;
    private String venue;
    private int ticketCount;
    private String seatNumbers;
    private BigDecimal totalAmount;
    private BigDecimal costPerSeat;
    private OrderStatus status;
    private Instant createdAt;
}