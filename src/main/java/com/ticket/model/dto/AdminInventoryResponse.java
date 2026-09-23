package com.ticket.model.dto;

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
public class AdminInventoryResponse {
    private UUID eventId;
    private String eventName;
    private int totalTickets;
    private int availableCount;
    private int heldCount;
    private int soldCount;
    private BigDecimal costPerSeat;
    private long version;
    private Instant updatedAt;
}
