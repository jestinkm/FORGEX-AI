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
public class QueueJoinResponse {
    private UUID eventId;
    private UUID userId;
    private Long queuePosition; // 1-based index (1 = next in line)
    private Long queueDepth;
    private Long estimatedWaitSeconds;
    private String status; // QUEUED, ALREADY_ADMITTED
    private String admissionToken;
}
