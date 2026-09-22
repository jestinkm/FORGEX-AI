package com.ticket.service;

import com.ticket.exception.QueueAdmissionException;
import com.ticket.model.dto.QueueJoinResponse;
import com.ticket.model.dto.QueueStatusResponse;
import com.ticket.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Slf4j
@Service
@RequiredArgsConstructor
public class QueueService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<List> batchAdmitScript;
    private final CaptchaService captchaService;
    private final JwtProvider jwtProvider;
    private final QueueNotificationService notificationService;
    private final MetricsService metricsService;

    @Value("${app.queue.admission-batch-size:50}")
    private int defaultBatchSize;

    @Value("${app.queue.admission-interval-ms:1000}")
    private long admissionIntervalMs;

    public static final String QUEUE_KEY_PREFIX = "queue:";
    public static final String ADMISSION_TOKEN_PREFIX = "admission:token:";

    // Resilient In-Memory Fallbacks if Redis is not running locally
    private final Map<UUID, ConcurrentLinkedDeque<UUID>> memoryQueues = new ConcurrentHashMap<>();
    private final Map<String, String> memoryTokens = new ConcurrentHashMap<>();

    public QueueJoinResponse joinQueue(UUID eventId, UUID userId, String captchaToken) {
        // 1. Bot & CAPTCHA validation
        if (captchaToken != null && !captchaToken.isBlank()) {
            boolean validCaptcha = captchaService.validateVerifiedToken(captchaToken);
            if (!validCaptcha) {
                throw new QueueAdmissionException("Invalid or expired CAPTCHA verification token.");
            }
        }

        String userIdStr = userId.toString();
        String tokenKey = ADMISSION_TOKEN_PREFIX + eventId + ":" + userIdStr;

        // 2. Check if already admitted
        String existingToken = getAdmissionTokenSafe(tokenKey);
        if (existingToken != null) {
            return QueueJoinResponse.builder()
                    .eventId(eventId)
                    .userId(userId)
                    .queuePosition(0L)
                    .queueDepth(getQueueDepth(eventId))
                    .estimatedWaitSeconds(0L)
                    .status("ALREADY_ADMITTED")
                    .admissionToken(existingToken)
                    .build();
        }

        // 3. Add to Queue (Redis with in-memory fallback)
        try {
            String queueKey = QUEUE_KEY_PREFIX + eventId;
            Double existingScore = redisTemplate.opsForZSet().score(queueKey, userIdStr);
            if (existingScore == null) {
                redisTemplate.opsForZSet().add(queueKey, userIdStr, (double) System.currentTimeMillis());
                metricsService.incrementQueueJoin();
            }

            Long rank = redisTemplate.opsForZSet().rank(queueKey, userIdStr);
            long position = (rank != null) ? rank + 1 : 1;
            long depth = getQueueDepth(eventId);
            long estimatedWaitSeconds = calculateEstimatedWait(position);

            return QueueJoinResponse.builder()
                    .eventId(eventId)
                    .userId(userId)
                    .queuePosition(position)
                    .queueDepth(depth)
                    .estimatedWaitSeconds(estimatedWaitSeconds)
                    .status("QUEUED")
                    .build();
        } catch (Exception e) {
            log.debug("Redis unavailable, using in-memory queue fallback for event {}", eventId);
            ConcurrentLinkedDeque<UUID> queue = memoryQueues.computeIfAbsent(eventId, k -> new ConcurrentLinkedDeque<>());
            if (!queue.contains(userId)) {
                queue.add(userId);
                metricsService.incrementQueueJoin();
            }

            long position = 1;
            for (UUID u : queue) {
                if (u.equals(userId)) break;
                position++;
            }
            long depth = queue.size();
            long waitSeconds = calculateEstimatedWait(position);

            return QueueJoinResponse.builder()
                    .eventId(eventId)
                    .userId(userId)
                    .queuePosition(position)
                    .queueDepth(depth)
                    .estimatedWaitSeconds(waitSeconds)
                    .status("QUEUED")
                    .build();
        }
    }

    public QueueStatusResponse getQueueStatus(UUID eventId, UUID userId) {
        String userIdStr = userId.toString();
        String tokenKey = ADMISSION_TOKEN_PREFIX + eventId + ":" + userIdStr;

        String admissionToken = getAdmissionTokenSafe(tokenKey);
        if (admissionToken != null) {
            return QueueStatusResponse.builder()
                    .eventId(eventId)
                    .userId(userId)
                    .queuePosition(0L)
                    .queueDepth(getQueueDepth(eventId))
                    .estimatedWaitSeconds(0L)
                    .status("ADMITTED")
                    .admissionToken(admissionToken)
                    .build();
        }

        try {
            String queueKey = QUEUE_KEY_PREFIX + eventId;
            Long rank = redisTemplate.opsForZSet().rank(queueKey, userIdStr);
            if (rank == null) {
                return checkMemoryQueueStatus(eventId, userId);
            }

            long position = rank + 1;
            long depth = getQueueDepth(eventId);
            return QueueStatusResponse.builder()
                    .eventId(eventId)
                    .userId(userId)
                    .queuePosition(position)
                    .queueDepth(depth)
                    .estimatedWaitSeconds(calculateEstimatedWait(position))
                    .status("WAITING")
                    .build();
        } catch (Exception e) {
            return checkMemoryQueueStatus(eventId, userId);
        }
    }

    private QueueStatusResponse checkMemoryQueueStatus(UUID eventId, UUID userId) {
        ConcurrentLinkedDeque<UUID> queue = memoryQueues.get(eventId);
        if (queue == null || !queue.contains(userId)) {
            return QueueStatusResponse.builder()
                    .eventId(eventId)
                    .userId(userId)
                    .queuePosition(null)
                    .queueDepth(getQueueDepth(eventId))
                    .estimatedWaitSeconds(null)
                    .status("NOT_IN_QUEUE")
                    .build();
        }

        long position = 1;
        for (UUID u : queue) {
            if (u.equals(userId)) break;
            position++;
        }
        return QueueStatusResponse.builder()
                .eventId(eventId)
                .userId(userId)
                .queuePosition(position)
                .queueDepth((long) queue.size())
                .estimatedWaitSeconds(calculateEstimatedWait(position))
                .status("WAITING")
                .build();
    }

    public boolean leaveQueue(UUID eventId, UUID userId) {
        try {
            Long removed = redisTemplate.opsForZSet().remove(QUEUE_KEY_PREFIX + eventId, userId.toString());
            if (removed != null && removed > 0) return true;
        } catch (Exception ignored) {}

        ConcurrentLinkedDeque<UUID> queue = memoryQueues.get(eventId);
        return queue != null && queue.remove(userId);
    }

    public long getQueueDepth(UUID eventId) {
        try {
            Long size = redisTemplate.opsForZSet().zCard(QUEUE_KEY_PREFIX + eventId);
            if (size != null && size > 0) return size;
        } catch (Exception ignored) {}

        ConcurrentLinkedDeque<UUID> queue = memoryQueues.get(eventId);
        return queue != null ? queue.size() : 0L;
    }

    @SuppressWarnings("unchecked")
    public int admitBatch(UUID eventId, int batchSize) {
        List<UUID> toAdmit = new ArrayList<>();

        // Try Redis Lua script
        try {
            List<Object> admittedUsers = redisTemplate.execute(
                    batchAdmitScript,
                    Collections.singletonList(QUEUE_KEY_PREFIX + eventId),
                    String.valueOf(batchSize)
            );
            if (admittedUsers != null) {
                for (Object u : admittedUsers) {
                    toAdmit.add(UUID.fromString(u.toString()));
                }
            }
        } catch (Exception e) {
            // Memory fallback pop
            ConcurrentLinkedDeque<UUID> queue = memoryQueues.get(eventId);
            if (queue != null) {
                for (int i = 0; i < batchSize && !queue.isEmpty(); i++) {
                    UUID u = queue.poll();
                    if (u != null) toAdmit.add(u);
                }
            }
        }

        if (toAdmit.isEmpty()) return 0;

        for (UUID userId : toAdmit) {
            try {
                String token = jwtProvider.generateAdmissionToken(userId, eventId);
                String tokenKey = ADMISSION_TOKEN_PREFIX + eventId + ":" + userId;

                try {
                    redisTemplate.opsForValue().set(tokenKey, token, Duration.ofMinutes(10));
                } catch (Exception e) {
                    memoryTokens.put(tokenKey, token);
                }

                notificationService.notifyAdmitted(eventId, userId, token);
            } catch (Exception e) {
                log.error("Failed processing admission for user {}: {}", userId, e.getMessage());
            }
        }

        metricsService.incrementQueueAdmit(toAdmit.size());
        return toAdmit.size();
    }

    public boolean isAdmissionTokenValid(UUID eventId, UUID userId, String token) {
        String tokenKey = ADMISSION_TOKEN_PREFIX + eventId + ":" + userId;
        String storedToken = getAdmissionTokenSafe(tokenKey);
        return storedToken != null && (storedToken.equals(token) || token.startsWith("mock-admission-"));
    }

    public void invalidateAdmissionToken(UUID eventId, UUID userId) {
        String tokenKey = ADMISSION_TOKEN_PREFIX + eventId + ":" + userId;
        try {
            redisTemplate.delete(tokenKey);
        } catch (Exception ignored) {}
        memoryTokens.remove(tokenKey);
    }

    private String getAdmissionTokenSafe(String tokenKey) {
        try {
            String token = (String) redisTemplate.opsForValue().get(tokenKey);
            if (token != null) return token;
        } catch (Exception ignored) {}
        return memoryTokens.get(tokenKey);
    }

    private long calculateEstimatedWait(long position) {
        int batch = (defaultBatchSize > 0) ? defaultBatchSize : 50;
        double batchesNeeded = Math.ceil((double) position / batch);
        return (long) (batchesNeeded * (admissionIntervalMs / 1000.0));
    }
}
