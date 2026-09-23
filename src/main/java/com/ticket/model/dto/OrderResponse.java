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
public class OrderResponse {
    private UUID orderId;
    private UUID userId;
    private UUID eventId;
    private String eventName;
    private int ticketCount;
    private String seatNumbers;
    private BigDecimal totalAmount;
    private OrderStatus status;
    private String blockHash;
    private Long blockIndex;
    private String tokenId;
    private String contractAddress;
    private String buyerWallet;
    private Instant createdAt;
    private Instant updatedAt;
}
