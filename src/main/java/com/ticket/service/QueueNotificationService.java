package com.ticket.service;

import com.ticket.model.dto.QueueStatusResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class QueueNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    // Map of User UUID -> SseEmitter for clients using Server-Sent Events
    private final Map<UUID, SseEmitter> sseEmitters = new ConcurrentHashMap<>();

    public SseEmitter registerSseEmitter(UUID userId) {
        SseEmitter emitter = new SseEmitter(600_000L); // 10 minutes timeout

        emitter.onCompletion(() -> sseEmitters.remove(userId));
        emitter.onTimeout(() -> {
            emitter.complete();
            sseEmitters.remove(userId);
        });
        emitter.onError(e -> {
            emitter.complete();
            sseEmitters.remove(userId);
        });

        sseEmitters.put(userId, emitter);
        return emitter;
    }

    public void notifyAdmitted(UUID eventId, UUID userId, String admissionToken) {
        QueueStatusResponse status = QueueStatusResponse.builder()
                .eventId(eventId)
                .userId(userId)
                .queuePosition(0L)
                .status("ADMITTED")
                .admissionToken(admissionToken)
                .estimatedWaitSeconds(0L)
                .build();

        // 1. Send via STOMP WebSocket
        try {
            messagingTemplate.convertAndSend("/topic/queue/" + eventId + "/" + userId, status);
        } catch (Exception e) {
            log.warn("Failed to send WebSocket admission notification for user {}: {}", userId, e.getMessage());
        }

        // 2. Send via SSE if connected
        SseEmitter emitter = sseEmitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("ADMITTED")
                        .data(status));
                emitter.complete();
            } catch (IOException e) {
                sseEmitters.remove(userId);
            }
        }
    }

    public void notifyQueueProgress(UUID eventId, UUID userId, Long position, Long estimatedSeconds) {
        QueueStatusResponse status = QueueStatusResponse.builder()
                .eventId(eventId)
                .userId(userId)
                .queuePosition(position)
                .status("WAITING")
                .estimatedWaitSeconds(estimatedSeconds)
                .build();

        try {
            messagingTemplate.convertAndSend("/topic/queue/" + eventId + "/" + userId, status);
        } catch (Exception e) {
            log.debug("No active STOMP subscriber for user {}", userId);
        }

        SseEmitter emitter = sseEmitters.get(userId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                        .name("QUEUE_UPDATE")
                        .data(status));
            } catch (IOException e) {
                sseEmitters.remove(userId);
            }
        }
    }
}
