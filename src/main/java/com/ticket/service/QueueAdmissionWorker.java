package com.ticket.service;

import com.ticket.model.entity.Event;
import com.ticket.model.enums.EventStatus;
import com.ticket.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class QueueAdmissionWorker {

    private final QueueService queueService;
    private final EventRepository eventRepository;

    @Value("${app.queue.admission-batch-size:50}")
    private int batchSize;

    public void setBatchSize(int newBatchSize) {
        this.batchSize = newBatchSize;
    }

    public int getBatchSize() {
        return this.batchSize;
    }

    @Scheduled(fixedDelayString = "${app.queue.admission-interval-ms:1000}")
    public void processQueueAdmissions() {
        try {
            List<Event> activeEvents = eventRepository.findByStatus(EventStatus.ACTIVE);
            for (Event event : activeEvents) {
                long depth = queueService.getQueueDepth(event.getId());
                if (depth > 0) {
                    queueService.admitBatch(event.getId(), batchSize);
                }
            }
        } catch (Exception e) {
            log.error("Error in QueueAdmissionWorker execution: {}", e.getMessage());
        }
    }
}
