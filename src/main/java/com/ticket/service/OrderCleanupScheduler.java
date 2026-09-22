package com.ticket.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderCleanupScheduler {

    private final OrderService orderService;

    @Scheduled(fixedDelayString = "${app.order.cleanup-interval-ms:15000}")
    public void cleanupExpiredHolds() {
        try {
            int releasedCount = orderService.releaseExpiredOrders();
            if (releasedCount > 0) {
                log.info("OrderCleanupScheduler released {} expired ticket holds back to inventory.", releasedCount);
            }
        } catch (Exception e) {
            log.error("Error executing cleanup of expired order holds: {}", e.getMessage(), e);
        }
    }
}
