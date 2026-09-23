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
public class HoldTicketResponse {
    private UUID orderId;
    private UUID eventId;
    private UUID userId;
    private int ticketCount;
    private String seatNumbers;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private Instant holdExpiresAt;
    private long expiresInSeconds;
}
