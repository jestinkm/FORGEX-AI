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
public class UserAccessFrequencyResponse {
    private UUID userId;
    private String userName;
    private String userEmail;
    private String role;
    private long totalAccessCount;
    private long loginCount;
    private long captchaCount;
    private long holdCount;
    private long paymentCount;
    private long confirmedCount;
    private Instant lastAccessTime;
    private String latestAction;
    private String lastIpAddress;
    private String accessFrequencyTier;
}
