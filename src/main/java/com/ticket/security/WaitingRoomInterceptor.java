package com.ticket.security;

import com.ticket.exception.QueueAdmissionException;
import com.ticket.service.QueueService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class WaitingRoomInterceptor implements HandlerInterceptor {

    public static final String ADMISSION_TOKEN_HEADER = "X-Admission-Token";
    public static final String ATTR_ADMISSION_USER_ID = "admissionUserId";
    public static final String ATTR_ADMISSION_EVENT_ID = "admissionEventId";

    private final JwtProvider jwtProvider;
    private final QueueService queueService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String path = request.getRequestURI();

        // Skip webhook and public payment callbacks
        if (path.contains("/api/payments/webhook") || path.contains("/api/admin")) {
            return true;
        }

        String admissionToken = request.getHeader(ADMISSION_TOKEN_HEADER);
        if (admissionToken == null || admissionToken.isBlank()) {
            throw new QueueAdmissionException("Missing X-Admission-Token header. You must join the virtual waiting room before checkout.");
        }

        if (!jwtProvider.validateToken(admissionToken) || !jwtProvider.isAdmissionToken(admissionToken)) {
            throw new QueueAdmissionException("Invalid or expired admission token. Please return to the waiting room.");
        }

        UUID userId = jwtProvider.extractUserId(admissionToken);
        UUID eventId = jwtProvider.extractEventId(admissionToken);

        if (!queueService.isAdmissionTokenValid(eventId, userId, admissionToken)) {
            throw new QueueAdmissionException("Admission token has already been consumed or has expired from the queue session.");
        }

        request.setAttribute(ATTR_ADMISSION_USER_ID, userId);
        request.setAttribute(ATTR_ADMISSION_EVENT_ID, eventId);
        return true;
    }
}
