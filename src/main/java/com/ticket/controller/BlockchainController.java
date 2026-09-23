package com.ticket.controller;

import com.ticket.exception.ResourceNotFoundException;
import com.ticket.model.dto.ApiResponse;
import com.ticket.model.dto.BlockchainBlockResponse;
import com.ticket.model.dto.BlockchainStatsResponse;
import com.ticket.model.dto.BlockchainVerifyResponse;
import com.ticket.service.BlockchainService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blockchain")
@RequiredArgsConstructor
@Tag(name = "Blockchain Theatre Seat Ledger", description = "On-chain seat booking, cryptographic verification, and NFT ticket minting")
public class BlockchainController {

    private final BlockchainService blockchainService;

    @GetMapping("/chain")
    @Operation(summary = "Get Full Blockchain Ledger", description = "Retrieves complete cryptographic block history")
    public ResponseEntity<ApiResponse<List<BlockchainBlockResponse>>> getChain() {
        List<BlockchainBlockResponse> chain = blockchainService.getChain();
        return ResponseEntity.ok(ApiResponse.ok("Blockchain chain retrieved", chain));
    }

    @GetMapping("/block/{orderId}")
    @Operation(summary = "Get Block by Order ID", description = "Retrieves on-chain block and NFT ticket for a confirmed order")
    public ResponseEntity<ApiResponse<BlockchainBlockResponse>> getBlockByOrderId(@PathVariable String orderId) {
        BlockchainBlockResponse block = blockchainService.getBlockByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("No blockchain block found for order: " + orderId));
        return ResponseEntity.ok(ApiResponse.ok("Blockchain block found", block));
    }

    @GetMapping("/verify")
    @Operation(summary = "Verify Blockchain Integrity", description = "Executes real-time mathematical validation across all SHA-256 block hashes and merkle proofs")
    public ResponseEntity<ApiResponse<BlockchainVerifyResponse>> verifyChain() {
        BlockchainVerifyResponse verifyResult = blockchainService.verifyChainIntegrity();
        return ResponseEntity.ok(ApiResponse.ok("Chain integrity evaluated", verifyResult));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get Blockchain Stats", description = "Retrieves block height, on-chain seats count, and contract address")
    public ResponseEntity<ApiResponse<BlockchainStatsResponse>> getStats() {
        BlockchainStatsResponse stats = blockchainService.getStats();
        return ResponseEntity.ok(ApiResponse.ok("Blockchain stats retrieved", stats));
    }
}
