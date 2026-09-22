package com.ticket.controller;

import com.ticket.model.dto.ApiResponse;
import com.ticket.model.dto.CaptchaChallengeResponse;
import com.ticket.model.dto.CaptchaVerifyRequest;
import com.ticket.service.CaptchaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/captcha")
@RequiredArgsConstructor
@Tag(name = "CAPTCHA & Bot Protection", description = "Endpoints for anti-bot verification prior to queue entry")
public class CaptchaController {

    private final CaptchaService captchaService;
    private final com.ticket.service.ActivityLogService activityLogService;

    @GetMapping("/challenge")
    @Operation(summary = "Generate CAPTCHA challenge", description = "Generates a dynamic challenge for the client to solve")
    public ResponseEntity<ApiResponse<CaptchaChallengeResponse>> getChallenge() {
        CaptchaService.ChallengeData challengeData = captchaService.createChallenge();
        CaptchaChallengeResponse response = CaptchaChallengeResponse.builder()
                .captchaId(challengeData.captchaId())
                .challenge(challengeData.challengeQuestion())
                .expiresAt(challengeData.expiresAt())
                .build();
        return ResponseEntity.ok(ApiResponse.ok("Challenge generated", response));
    }

    @PostMapping("/verify")
    @Operation(summary = "Verify CAPTCHA challenge", description = "Validates the solution and provides a single-use token for queue admission")
    public ResponseEntity<ApiResponse<Map<String, String>>> verifyChallenge(@Valid @RequestBody CaptchaVerifyRequest request) {
        String token = captchaService.verifyAndIssueToken(request.getCaptchaId(), request.getSolution());
        if (token == null) {
            activityLogService.recordActivity(null, null, "CAPTCHA_FAILED", "Failed CAPTCHA solution for challenge ID " + request.getCaptchaId(), "FAILED", null);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.ok("Invalid or expired CAPTCHA solution", null));
        }
        activityLogService.recordActivity(null, null, "CAPTCHA_VERIFIED", "Successfully solved security CAPTCHA challenge", "SUCCESS", null);
        return ResponseEntity.ok(ApiResponse.ok("Verification successful", Map.of("captchaToken", token)));
    }
}
