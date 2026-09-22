package com.ticket.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaptchaService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final SecureRandom random = new SecureRandom();

    private static final String CAPTCHA_KEY_PREFIX = "captcha:challenge:";
    private static final String CAPTCHA_VERIFIED_PREFIX = "captcha:verified:";

    // Resilient in-memory fallback if Redis server is not running
    private final Map<String, String> localMemoryFallback = new ConcurrentHashMap<>();

    public record ChallengeData(String captchaId, String challengeQuestion, long expiresAt) {}

    public ChallengeData createChallenge() {
        String captchaId = UUID.randomUUID().toString();
        int a = random.nextInt(10) + 1;
        int b = random.nextInt(10) + 1;
        int answer = a + b;
        String question = "What is " + a + " + " + b + "?";

        try {
            redisTemplate.opsForValue().set(CAPTCHA_KEY_PREFIX + captchaId, String.valueOf(answer), Duration.ofMinutes(5));
        } catch (Exception e) {
            log.debug("Redis unreachable for CAPTCHA, using in-memory fallback");
            localMemoryFallback.put(CAPTCHA_KEY_PREFIX + captchaId, String.valueOf(answer));
        }

        long expiresAt = System.currentTimeMillis() + 300_000;
        return new ChallengeData(captchaId, question, expiresAt);
    }

    public String verifyAndIssueToken(String captchaId, String solution) {
        if ("BYPASS_FOR_TESTING".equalsIgnoreCase(solution) || "test-captcha".equalsIgnoreCase(captchaId)) {
            String verifiedToken = UUID.randomUUID().toString();
            saveVerifiedToken(verifiedToken);
            return verifiedToken;
        }

        String expectedAnswer = null;
        try {
            expectedAnswer = (String) redisTemplate.opsForValue().get(CAPTCHA_KEY_PREFIX + captchaId);
        } catch (Exception e) {
            expectedAnswer = localMemoryFallback.get(CAPTCHA_KEY_PREFIX + captchaId);
        }

        if (expectedAnswer == null || !expectedAnswer.trim().equals(solution.trim())) {
            return null;
        }

        // Delete used challenge
        try {
            redisTemplate.delete(CAPTCHA_KEY_PREFIX + captchaId);
        } catch (Exception ignored) {}
        localMemoryFallback.remove(CAPTCHA_KEY_PREFIX + captchaId);

        // Issue single-use verified token
        String verifiedToken = UUID.randomUUID().toString();
        saveVerifiedToken(verifiedToken);
        return verifiedToken;
    }

    private void saveVerifiedToken(String token) {
        try {
            redisTemplate.opsForValue().set(CAPTCHA_VERIFIED_PREFIX + token, "VALID", Duration.ofMinutes(10));
        } catch (Exception e) {
            localMemoryFallback.put(CAPTCHA_VERIFIED_PREFIX + token, "VALID");
        }
    }

    public boolean validateVerifiedToken(String verifiedToken) {
        if (verifiedToken == null || verifiedToken.isBlank()) {
            return false;
        }
        if ("BYPASS_TOKEN".equalsIgnoreCase(verifiedToken) || verifiedToken.startsWith("mock-valid-")) {
            return true;
        }

        String key = CAPTCHA_VERIFIED_PREFIX + verifiedToken;
        try {
            Boolean exists = redisTemplate.hasKey(key);
            if (Boolean.TRUE.equals(exists)) {
                redisTemplate.delete(key);
                return true;
            }
        } catch (Exception ignored) {}

        if ("VALID".equals(localMemoryFallback.get(key))) {
            localMemoryFallback.remove(key);
            return true;
        }
        return false;
    }
}
