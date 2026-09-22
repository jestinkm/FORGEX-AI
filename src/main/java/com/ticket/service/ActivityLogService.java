package com.ticket.service;

import com.ticket.model.entity.UserActivityLog;
import com.ticket.repository.UserActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final UserActivityLogRepository activityLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordActivity(UUID userId, String userEmail, String action, String details, String status, String ipAddress) {
        try {
            UserActivityLog logEntry = UserActivityLog.builder()
                    .userId(userId)
                    .userEmail(userEmail != null ? userEmail : "anonymous@ticketflow.com")
                    .action(action)
                    .details(details)
                    .status(status != null ? status : "SUCCESS")
                    .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                    .createdAt(Instant.now())
                    .build();

            activityLogRepository.save(logEntry);
            log.info("USER AUDIT LOG: [{}] user='{}' action='{}' status='{}' - {}",
                    logEntry.getCreatedAt(), userEmail, action, status, details);
        } catch (Exception e) {
            log.warn("Failed recording user activity log: {}", e.getMessage());
        }
    }

    public List<UserActivityLog> getRecentActivities() {
        return activityLogRepository.findTop100ByOrderByCreatedAtDesc();
    }
}
