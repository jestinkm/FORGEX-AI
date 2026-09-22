package com.ticket.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
public class HoldTicketRequest {
    @NotNull(message = "Event ID is required")
    private UUID eventId;

    @Min(value = 1, message = "At least 1 ticket must be requested")
    @Max(value = 10, message = "Maximum 10 tickets allowed per hold")
    private int ticketCount;
}
