package com.ticket.service;

import com.ticket.exception.InventoryUnavailableException;
import com.ticket.model.entity.Event;
import com.ticket.model.entity.TicketInventory;
import com.ticket.model.enums.EventStatus;
import com.ticket.repository.EventRepository;
import com.ticket.repository.TicketInventoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class OptimisticLockingInventoryTest {

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private TicketInventoryRepository inventoryRepository;

    private UUID eventId;

    @BeforeEach
    void setUp() {
        inventoryRepository.deleteAll();
        eventRepository.deleteAll();

        Event event = Event.builder()
                .name("Flash Sale Concurrency Concert")
                .description("Test concert for concurrency")
                .venue("Virtual Arena")
                .startTime(Instant.now().plusSeconds(86400))
                .totalTickets(20)
                .status(EventStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        event = eventRepository.save(event);
        eventId = event.getId();

        TicketInventory inventory = TicketInventory.builder()
                .event(event)
                .availableCount(20)
                .heldCount(0)
                .soldCount(0)
                .version(0L)
                .updatedAt(Instant.now())
                .build();
        inventoryRepository.save(inventory);
    }

    @Test
    @DisplayName("Multiple concurrent threads holding tickets should never oversell due to optimistic locking")
    void shouldPreventOversellingUnderConcurrentLoad() throws InterruptedException {
        int numberOfThreads = 15;
        int ticketsPerRequest = 2; // Total requested = 30, but only 20 are available
        ExecutorService executorService = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successfulHolds = new AtomicInteger(0);
        AtomicInteger rejectedHolds = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            executorService.submit(() -> {
                try {
                    startLatch.await(); // Synchronize all threads to hit concurrently
                    inventoryService.holdTicketsWithRetry(eventId, ticketsPerRequest);
                    successfulHolds.incrementAndGet();
                } catch (Exception e) {
                    rejectedHolds.incrementAndGet();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Fire all threads simultaneously
        startLatch.countDown();
        finishLatch.await();
        executorService.shutdown();

        TicketInventory finalInventory = inventoryService.getInventory(eventId);

        // Verification: Exactly 20 tickets can be allocated across successful requests (10 successful holds of 2)
        int expectedMaxSuccessful = 20 / ticketsPerRequest;
        assertThat(successfulHolds.get()).isLessThanOrEqualTo(expectedMaxSuccessful);
        assertThat(finalInventory.getHeldCount()).isEqualTo(successfulHolds.get() * ticketsPerRequest);
        assertThat(finalInventory.getAvailableCount()).isEqualTo(20 - finalInventory.getHeldCount());

        // Invariant: Available + Held + Sold must STRICTLY equal initial total (20)
        assertThat(finalInventory.getAvailableCount() + finalInventory.getHeldCount() + finalInventory.getSoldCount())
                .isEqualTo(20);
    }
}
