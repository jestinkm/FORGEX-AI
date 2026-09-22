package com.ticket.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ticket.model.dto.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@Order(10)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RedisSlidingWindowRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;

    @Value("${app.rate-limit.ip-permits-per-second:10}")
    private int ipPermitsPerSecond;

    @Value("${app.rate-limit.window-seconds:1}")
    private long windowSeconds;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator") ||
               path.startsWith("/swagger-ui") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/ws");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String clientIp = extractClientIp(request);
        String ipKey = "rate:ip:" + clientIp;

        // Check IP-level rate limit
        if (!rateLimiter.tryAcquire(ipKey, ipPermitsPerSecond, windowSeconds)) {
            sendRateLimitResponse(request, response, "IP rate limit exceeded. Please slow down.");
            return;
        }

        // Check User-level rate limit if authenticated
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            String userKey = "rate:user:" + auth.getName();
            int userLimit = ipPermitsPerSecond * 2; // Allow higher burst for identified users
            if (!rateLimiter.tryAcquire(userKey, userLimit, windowSeconds)) {
                sendRateLimitResponse(request, response, "User rate limit exceeded. Please slow down.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String header = request.getHeader("X-Forwarded-For");
        if (header != null && !header.isBlank()) {
            return header.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void sendRateLimitResponse(HttpServletRequest request,
                                       HttpServletResponse response,
                                       String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(windowSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        String correlationId = MDC.get(CorrelationIdFilter.MDC_KEY);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error(HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase())
                .message(message)
                .path(request.getRequestURI())
                .correlationId(correlationId != null ? correlationId : "N/A")
                .timestamp(Instant.now())
                .details(List.of("Exceeded maximum request frequency: " + ipPermitsPerSecond + " req/sec"))
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
