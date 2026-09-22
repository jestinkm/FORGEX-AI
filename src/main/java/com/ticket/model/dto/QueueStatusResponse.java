package com.ticket.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueStatusResponse {
    private UUID eventId;
    private UUID userId;
    private Long queuePosition; // 1-based, null if admitted or not in queue
    private Long queueDepth;
    private Long estimatedWaitSeconds;
    private String status; // WAITING, ADMITTED, NOT_IN_QUEUE
    private String admissionToken;
}
