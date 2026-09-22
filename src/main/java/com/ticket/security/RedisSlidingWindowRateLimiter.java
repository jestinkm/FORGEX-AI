package com.ticket.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class RedisSlidingWindowRateLimiter {

    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisScript<Long> rateLimiterScript;

    /**
     * Checks if a request should be allowed according to the sliding window algorithm.
     *
     * @param key           Unique rate limit key (e.g., rate:ip:127.0.0.1)
     * @param maxRequests   Allowed requests within the window
     * @param windowSeconds Window length in seconds
     * @return true if allowed, false if rejected
     */
    public boolean tryAcquire(String key, int maxRequests, long windowSeconds) {
        long now = System.currentTimeMillis();
        long windowMillis = windowSeconds * 1000;

        try {
            Long result = redisTemplate.execute(
                    rateLimiterScript,
                    Collections.singletonList(key),
                    String.valueOf(now),
                    String.valueOf(windowMillis),
                    String.valueOf(maxRequests)
            );

            return result != null && result == 1L;
        } catch (Exception e) {
            log.error("Redis rate limiter error for key {}: {}. Failing open to maintain availability.", key, e.getMessage());
            return true; // Fail open if Redis has a temporary glitch
        }
    }
}
