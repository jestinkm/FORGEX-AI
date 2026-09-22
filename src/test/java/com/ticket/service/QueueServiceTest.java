package com.ticket.service;

import com.ticket.model.dto.QueueJoinResponse;
import com.ticket.model.dto.QueueStatusResponse;
import com.ticket.security.JwtProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QueueServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private ZSetOperations<String, Object> zSetOperations;
    @Mock
    private ValueOperations<String, Object> valueOperations;
    @Mock
    private RedisScript<List> batchAdmitScript;
    @Mock
    private CaptchaService captchaService;
    @Mock
    private JwtProvider jwtProvider;
    @Mock
    private QueueNotificationService notificationService;
    @Mock
    private MetricsService metricsService;

    @InjectMocks
    private QueueService queueService;

    private UUID eventId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        eventId = UUID.randomUUID();
        userId = UUID.randomUUID();
        ReflectionTestUtils.setField(queueService, "defaultBatchSize", 10);
        ReflectionTestUtils.setField(queueService, "admissionIntervalMs", 1000L);
    }

    @Test
    @DisplayName("User should be added to queue with FIFO ordering and rank returned")
    void shouldJoinQueueSuccessfully() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(valueOperations.get(anyString())).thenReturn(null); // Not yet admitted
        when(zSetOperations.score(anyString(), anyString())).thenReturn(null); // Not yet in ZSET
        when(zSetOperations.rank(anyString(), anyString())).thenReturn(4L); // 5th in queue (0-indexed 4)
        when(zSetOperations.zCard(anyString())).thenReturn(25L);

        QueueJoinResponse response = queueService.joinQueue(eventId, userId, null);

        assertThat(response).isNotNull();
        assertThat(response.getEventId()).isEqualTo(eventId);
        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getQueuePosition()).isEqualTo(5L);
        assertThat(response.getQueueDepth()).isEqualTo(25L);
        assertThat(response.getStatus()).isEqualTo("QUEUED");

        verify(zSetOperations).add(eq(QueueService.QUEUE_KEY_PREFIX + eventId), eq(userId.toString()), anyDouble());
        verify(metricsService).incrementQueueJoin();
    }

    @Test
    @DisplayName("Should return ALREADY_ADMITTED if user holds a valid admission token")
    void shouldReturnAlreadyAdmittedIfTokenExists() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(QueueService.ADMISSION_TOKEN_PREFIX + eventId + ":" + userId))
                .thenReturn("mock-valid-admission-token");
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(zSetOperations.zCard(anyString())).thenReturn(10L);

        QueueJoinResponse response = queueService.joinQueue(eventId, userId, null);

        assertThat(response.getStatus()).isEqualTo("ALREADY_ADMITTED");
        assertThat(response.getAdmissionToken()).isEqualTo("mock-valid-admission-token");
        assertThat(response.getQueuePosition()).isEqualTo(0L);
        verify(zSetOperations, never()).add(anyString(), any(), anyDouble());
    }

    @Test
    @DisplayName("Atomic batch admission should mint tokens and push WebSocket notifications")
    void shouldAdmitBatchOfUsersAtomically() {
        UUID user1 = UUID.randomUUID();
        UUID user2 = UUID.randomUUID();
        List<Object> admittedUsers = List.of(user1.toString(), user2.toString());

        when(redisTemplate.execute(eq(batchAdmitScript), anyList(), eq("2")))
                .thenReturn(admittedUsers);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(jwtProvider.generateAdmissionToken(any(UUID.class), eq(eventId)))
                .thenReturn("sample-jwt-admission-token");

        int admittedCount = queueService.admitBatch(eventId, 2);

        assertThat(admittedCount).isEqualTo(2);
        verify(valueOperations, times(2)).set(
                anyString(),
                eq("sample-jwt-admission-token"),
                eq(Duration.ofMinutes(10))
        );
        verify(notificationService, times(2)).notifyAdmitted(eq(eventId), any(UUID.class), eq("sample-jwt-admission-token"));
        verify(metricsService).incrementQueueAdmit(2);
    }

    @Test
    @DisplayName("Should return correct status when user is waiting in queue")
    void shouldReturnWaitingStatus() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.opsForZSet()).thenReturn(zSetOperations);
        when(valueOperations.get(anyString())).thenReturn(null);
        when(zSetOperations.rank(anyString(), eq(userId.toString()))).thenReturn(0L); // Rank 0 = 1st in line
        when(zSetOperations.zCard(anyString())).thenReturn(50L);

        QueueStatusResponse status = queueService.getQueueStatus(eventId, userId);

        assertThat(status.getStatus()).isEqualTo("WAITING");
        assertThat(status.getQueuePosition()).isEqualTo(1L);
        assertThat(status.getQueueDepth()).isEqualTo(50L);
    }
}
