package com.ticket.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SlidingWindowRateLimiterTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private RedisScript<Long> rateLimiterScript;

    @InjectMocks
    private RedisSlidingWindowRateLimiter rateLimiter;

    @Test
    @DisplayName("Should allow request when Lua script returns 1 (under limit)")
    void shouldAllowWhenUnderLimit() {
        when(redisTemplate.execute(eq(rateLimiterScript), anyList(), anyString(), anyString(), anyString()))
                .thenReturn(1L);

        boolean allowed = rateLimiter.tryAcquire("rate:ip:127.0.0.1", 5, 1);
        assertThat(allowed).isTrue();
    }

    @Test
    @DisplayName("Should reject request when Lua script returns 0 (limit exceeded)")
    void shouldRejectWhenLimitExceeded() {
        when(redisTemplate.execute(eq(rateLimiterScript), anyList(), anyString(), anyString(), anyString()))
                .thenReturn(0L);

        boolean allowed = rateLimiter.tryAcquire("rate:ip:127.0.0.1", 5, 1);
        assertThat(allowed).isFalse();
    }

    @Test
    @DisplayName("Should fail open when Redis connection encounters an unexpected exception")
    void shouldFailOpenOnRedisFailure() {
        when(redisTemplate.execute(eq(rateLimiterScript), anyList(), anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("Redis connection refused"));

        boolean allowed = rateLimiter.tryAcquire("rate:ip:127.0.0.1", 5, 1);
        assertThat(allowed).isTrue(); // Resilient design: fail open
    }
}
