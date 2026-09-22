package com.ticket.service;

import com.ticket.exception.InventoryUnavailableException;
import com.ticket.exception.ResourceNotFoundException;
import com.ticket.model.entity.TicketInventory;
import com.ticket.repository.TicketInventoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final TicketInventoryRepository inventoryRepository;

    private static final int MAX_OPTIMISTIC_RETRIES = 3;

    /**
     * Atomically holds tickets using optimistic locking (@Version).
     * Retries up to MAX_OPTIMISTIC_RETRIES in case of concurrent write collisions.
     */
    public TicketInventory holdTicketsWithRetry(UUID eventId, int count) {
        int attempts = 0;
        while (attempts < MAX_OPTIMISTIC_RETRIES) {
            attempts++;
            try {
                return executeHold(eventId, count);
            } catch (OptimisticLockingFailureException ex) {
                log.warn("Optimistic locking collision holding tickets for event {} on attempt {}/{}. Retrying...",
                        eventId, attempts, MAX_OPTIMISTIC_RETRIES);
                try {
                    Thread.sleep(20L * attempts); // jittered backoff
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Thread interrupted while retrying optimistic lock", ie);
                }
            }
        }
        throw new OptimisticLockingFailureException("High concurrent booking traffic. Please try holding tickets again.");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public TicketInventory executeHold(UUID eventId, int count) {
        TicketInventory inventory = inventoryRepository.findByEventId(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for event " + eventId));

        if (inventory.getAvailableCount() < count) {
            throw new InventoryUnavailableException(
                    String.format("Insufficient tickets available. Requested: %d, Available: %d",
                            count, inventory.getAvailableCount())
            );
        }

        inventory.setAvailableCount(inventory.getAvailableCount() - count);
        inventory.setHeldCount(inventory.getHeldCount() + count);

        // JPA automatically checks @Version column upon save and increments it.
        return inventoryRepository.save(inventory);
    }

    @Transactional
    public void releaseHeldTickets(UUID eventId, int count) {
        TicketInventory inventory = inventoryRepository.findByEventId(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for event " + eventId));

        int releaseCount = Math.min(count, inventory.getHeldCount());
        inventory.setHeldCount(inventory.getHeldCount() - releaseCount);
        inventory.setAvailableCount(inventory.getAvailableCount() + releaseCount);

        inventoryRepository.save(inventory);
        log.info("Released {} held tickets back to available inventory for event {}", releaseCount, eventId);
    }

    @Transactional
    public void confirmSoldTickets(UUID eventId, int count) {
        TicketInventory inventory = inventoryRepository.findByEventId(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for event " + eventId));

        if (inventory.getHeldCount() < count) {
            throw new InventoryUnavailableException("Cannot confirm order: held ticket count is less than requested count.");
        }

        inventory.setHeldCount(inventory.getHeldCount() - count);
        inventory.setSoldCount(inventory.getSoldCount() + count);

        inventoryRepository.save(inventory);
        log.info("Confirmed {} tickets sold for event {}", count, eventId);
    }

    @Transactional(readOnly = true)
    public TicketInventory getInventory(UUID eventId) {
        return inventoryRepository.findByEventId(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for event " + eventId));
    }
}
