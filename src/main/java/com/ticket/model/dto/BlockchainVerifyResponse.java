package com.ticket.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockchainVerifyResponse {
    private boolean valid;
    private long totalBlocks;
    private long verifiedSeats;
    private String genesisHash;
    private String latestBlockHash;
    private Instant lastVerifiedAt;
    private String consensusStatus;
    private String message;
}
