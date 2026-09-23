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
public class BlockchainStatsResponse {
    private long blockHeight;
    private long totalMintedTickets;
    private long totalSeatsOnChain;
    private String contractAddress;
    private String networkName;
    private String consensusAlgorithm;
    private String latestBlockHash;
    private Instant lastBlockTime;
    private boolean chainValid;
}
