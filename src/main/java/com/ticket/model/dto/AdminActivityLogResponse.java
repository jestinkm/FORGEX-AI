package com.ticket.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminActivityLogResponse {
    private UUID id;
    private UUID userId;
    private String userName;
    private String userEmail;
    private String action;
    private String details;
    private String status;
    private String ipAddress;
    private Instant createdAt;
}
