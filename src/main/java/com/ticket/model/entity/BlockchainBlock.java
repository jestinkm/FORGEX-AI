package com.ticket.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "blockchain_blocks", indexes = {
    @Index(name = "idx_block_index", columnList = "block_index", unique = true),
    @Index(name = "idx_block_hash", columnList = "block_hash", unique = true),
    @Index(name = "idx_block_order_id", columnList = "order_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlockchainBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "block_index", nullable = false)
    private Long blockIndex;

    @Column(name = "block_hash", nullable = false, length = 64)
    private String blockHash;

    @Column(name = "previous_hash", nullable = false, length = 64)
    private String previousHash;

    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @Column(name = "order_id", length = 64)
    private String orderId;

    @Column(name = "event_id", length = 64)
    private String eventId;

    @Column(name = "event_name", length = 255)
    private String eventName;

    @Column(name = "venue", length = 255)
    private String venue;

    @Column(name = "buyer_name", length = 255)
    private String buyerName;

    @Column(name = "buyer_email", length = 255)
    private String buyerEmail;

    @Column(name = "buyer_wallet", length = 64)
    private String buyerWallet;

    @Column(name = "seat_numbers", length = 255)
    private String seatNumbers;

    @Column(name = "ticket_count")
    private Integer ticketCount;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(name = "payment_utr", length = 64)
    private String paymentUtr;

    @Column(name = "token_id", length = 128)
    private String tokenId;

    @Column(name = "contract_address", length = 64)
    private String contractAddress;

    @Column(name = "nonce")
    private Long nonce;

    @Column(name = "merkle_root", length = 64)
    private String merkleRoot;

    @Column(name = "signature", length = 128)
    private String signature;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = Instant.now();
        }
    }
}
