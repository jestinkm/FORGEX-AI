package com.ticket.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockchainBlockResponse {
    private Long id;
    private Long blockIndex;
    private String blockHash;
    private String previousHash;
    private Instant timestamp;
    private String orderId;
    private String eventId;
    private String eventName;
    private String venue;
    private String buyerName;
    private String buyerEmail;
    private String buyerWallet;
    private String seatNumbers;
    private Integer ticketCount;
    private BigDecimal totalAmount;
    private String paymentUtr;
    private String tokenId;
    private String contractAddress;
    private Long nonce;
    private String merkleRoot;
    private String signature;
}
