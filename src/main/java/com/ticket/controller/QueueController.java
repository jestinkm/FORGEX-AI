package com.ticket.controller;

import com.ticket.model.dto.ApiResponse;
import com.ticket.model.dto.QueueJoinRequest;
import com.ticket.model.dto.QueueJoinResponse;
import com.ticket.model.dto.QueueStatusResponse;
import com.ticket.model.entity.User;
import com.ticket.service.QueueNotificationService;
import com.ticket.service.QueueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/queue")
@RequiredArgsConstructor
@Tag(name = "Virtual Waiting Room", description = "FIFO queue management to absorb traffic surges during flash sales")
public class QueueController {

    private final QueueService queueService;
    private final QueueNotificationService notificationService;

    @PostMapping("/join/{eventId}")
    @Operation(summary = "Join Waiting Room Queue", description = "Adds the authenticated user to the FIFO Redis queue for the specified event")
    public ResponseEntity<ApiResponse<QueueJoinResponse>> joinQueue(
            @PathVariable UUID eventId,
            @RequestBody(required = false) QueueJoinRequest request,
            @AuthenticationPrincipal User user) {

        String captchaToken = request != null ? request.getCaptchaToken() : null;
        QueueJoinResponse response = queueService.joinQueue(eventId, user.getId(), captchaToken);
        return ResponseEntity.ok(ApiResponse.ok("Queue status retrieved", response));
    }

    @GetMapping("/status/{eventId}")
    @Operation(summary = "Get Queue Status", description = "Returns current queue rank, estimated wait time, or admission token if admitted")
    public ResponseEntity<ApiResponse<QueueStatusResponse>> getStatus(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal User user) {

        QueueStatusResponse response = queueService.getQueueStatus(eventId, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping("/leave/{eventId}")
    @Operation(summary = "Leave Waiting Room Queue", description = "Removes the user from the waiting room queue")
    public ResponseEntity<ApiResponse<Boolean>> leaveQueue(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal User user) {

        boolean removed = queueService.leaveQueue(eventId, user.getId());
        return ResponseEntity.ok(ApiResponse.ok(removed ? "Successfully left the queue" : "User was not in queue", removed));
    }

    @GetMapping(value = "/stream/{eventId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Stream Queue Updates (SSE)", description = "Server-Sent Events fallback endpoint for streaming live queue progress")
    public SseEmitter streamQueueUpdates(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal User user) {

        log.info("Client connected to SSE queue updates for user {}", user.getId());
        return notificationService.registerSseEmitter(user.getId());
    }
}
