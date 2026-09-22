package com.ticket.controller;
 
import com.ticket.model.dto.*;
import com.ticket.model.entity.Event;
import com.ticket.model.entity.Order;
import com.ticket.model.entity.TicketInventory;
import com.ticket.model.enums.OrderStatus;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import com.ticket.repository.TicketInventoryRepository;
import com.ticket.repository.UserRepository;
import com.ticket.service.InventoryService;
import com.ticket.service.QueueAdmissionWorker;
import com.ticket.service.QueueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Tag(name = "Admin & Monitoring", description = "Operations and live queue/inventory observability endpoints")
public class AdminController {

    private final QueueService queueService;
    private final InventoryService inventoryService;
    private final QueueAdmissionWorker queueAdmissionWorker;
    private final OrderRepository orderRepository;
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final TicketInventoryRepository ticketInventoryRepository;
    private final com.ticket.service.ActivityLogService activityLogService;

    @GetMapping("/queue-depth/{eventId}")
    @Operation(summary = "Get Live Queue Depth", description = "Returns the real-time number of users waiting in the Redis queue for the event")
    public ResponseEntity<ApiResponse<AdminQueueDepthResponse>> getQueueDepth(@PathVariable UUID eventId) {
        long depth = queueService.getQueueDepth(eventId);
        AdminQueueDepthResponse response = AdminQueueDepthResponse.builder()
                .eventId(eventId)
                .queueDepth(depth)
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.ok(ApiResponse.ok("Current queue depth retrieved", response));
    }

    @GetMapping("/inventory/{eventId}")
    @Operation(summary = "Get Live Inventory Status", description = "Returns real-time inventory counts (available, held, sold) and optimistic lock version")
    public ResponseEntity<ApiResponse<AdminInventoryResponse>> getInventory(@PathVariable UUID eventId) {
        TicketInventory ti = inventoryService.getInventory(eventId);
        AdminInventoryResponse response = AdminInventoryResponse.builder()
                .eventId(eventId)
                .eventName(ti.getEvent().getName())
                .totalTickets(ti.getEvent().getTotalTickets())
                .availableCount(ti.getAvailableCount())
                .heldCount(ti.getHeldCount())
                .soldCount(ti.getSoldCount())
                .version(ti.getVersion())
                .updatedAt(ti.getUpdatedAt())
                .build();
        return ResponseEntity.ok(ApiResponse.ok("Live inventory retrieved", response));
    }

    @PostMapping("/admission-rate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Tune Admission Rate", description = "Dynamically adjusts the admission batch size admitted from the waiting room per interval")
    public ResponseEntity<ApiResponse<String>> tuneAdmissionRate(@Valid @RequestBody AdminAdmissionRateRequest request) {
        int previous = queueAdmissionWorker.getBatchSize();
        queueAdmissionWorker.setBatchSize(request.getBatchSize());
        return ResponseEntity.ok(ApiResponse.ok("Admission batch size updated from " + previous + " to " + request.getBatchSize(), null));
    }

    @GetMapping("/overview")
    @Transactional(readOnly = true)
    @Operation(summary = "Get Full Admin Overview", description = "Returns total seats, sold/held/available seats, total revenue, and recent customer bookings")
    public ResponseEntity<ApiResponse<AdminOverviewResponse>> getOverview() {
        List<Event> allEvents = eventRepository.findAll();
        List<AdminInventoryResponse> eventInventories = new ArrayList<>();
        long totalSeats = 0;
        long availableSeats = 0;
        long heldSeats = 0;
        long soldSeats = 0;

        for (Event event : allEvents) {
            TicketInventory ti = ticketInventoryRepository.findByEventId(event.getId()).orElse(null);
            if (ti != null) {
                totalSeats += event.getTotalTickets();
                availableSeats += ti.getAvailableCount();
                heldSeats += ti.getHeldCount();
                soldSeats += ti.getSoldCount();
                eventInventories.add(AdminInventoryResponse.builder()
                        .eventId(event.getId())
                        .eventName(event.getName())
                        .totalTickets(event.getTotalTickets())
                        .availableCount(ti.getAvailableCount())
                        .heldCount(ti.getHeldCount())
                        .soldCount(ti.getSoldCount())
                        .version(ti.getVersion())
                        .updatedAt(ti.getUpdatedAt())
                        .build());
            }
        }

        List<Order> orders = orderRepository.findAllWithUserAndEvent();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        List<AdminBookingResponse> bookingResponses = new ArrayList<>();

        for (Order o : orders) {
            if (o.getStatus() == OrderStatus.CONFIRMED) {
                totalRevenue = totalRevenue.add(o.getTotalAmount());
            }
            String email = o.getUser().getEmail();
            String name = email.contains("@") ? email.split("@")[0] : email;
            bookingResponses.add(AdminBookingResponse.builder()
                    .orderId(o.getId())
                    .userId(o.getUser().getId())
                    .customerEmail(email)
                    .customerName(name)
                    .eventId(o.getEvent().getId())
                    .eventName(o.getEvent().getName())
                    .venue(o.getEvent().getVenue())
                    .ticketCount(o.getTicketCount())
                    .totalAmount(o.getTotalAmount())
                    .status(o.getStatus())
                    .createdAt(o.getCreatedAt())
                    .build());
        }

        long totalUsers = userRepository.count();

        List<AdminActivityLogResponse> activityResponses = activityLogService.getRecentActivities().stream()
                .map(a -> AdminActivityLogResponse.builder()
                        .id(a.getId())
                        .userId(a.getUserId())
                        .userEmail(a.getUserEmail())
                        .action(a.getAction())
                        .details(a.getDetails())
                        .status(a.getStatus())
                        .ipAddress(a.getIpAddress())
                        .createdAt(a.getCreatedAt())
                        .build())
                .toList();

        AdminOverviewResponse overview = AdminOverviewResponse.builder()
                .totalEvents(allEvents.size())
                .totalSeats(totalSeats)
                .availableSeats(availableSeats)
                .heldSeats(heldSeats)
                .soldSeats(soldSeats)
                .totalRevenue(totalRevenue)
                .totalUsers(totalUsers)
                .events(eventInventories)
                .recentBookings(bookingResponses)
                .recentActivities(activityResponses)
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Admin overview retrieved", overview));
    }

    @GetMapping("/bookings")
    @Transactional(readOnly = true)
    @Operation(summary = "Get All Customer Seat Bookings", description = "Returns customer names, emails, seat counts, amounts in INR, and order status")
    public ResponseEntity<ApiResponse<List<AdminBookingResponse>>> getAllBookings() {
        List<Order> orders = orderRepository.findAllWithUserAndEvent();
        List<AdminBookingResponse> responses = orders.stream().map(o -> {
            String email = o.getUser().getEmail();
            String name = email.contains("@") ? email.split("@")[0] : email;
            return AdminBookingResponse.builder()
                    .orderId(o.getId())
                    .userId(o.getUser().getId())
                    .customerEmail(email)
                    .customerName(name)
                    .eventId(o.getEvent().getId())
                    .eventName(o.getEvent().getName())
                    .venue(o.getEvent().getVenue())
                    .ticketCount(o.getTicketCount())
                    .totalAmount(o.getTotalAmount())
                    .status(o.getStatus())
                    .createdAt(o.getCreatedAt())
                    .build();
        }).toList();

        return ResponseEntity.ok(ApiResponse.ok("All bookings retrieved", responses));
    }

    @GetMapping("/bookings/{eventId}")
    @Transactional(readOnly = true)
    @Operation(summary = "Get Event Customer Seat Bookings", description = "Returns customer bookings for a specific event")
    public ResponseEntity<ApiResponse<List<AdminBookingResponse>>> getBookingsByEvent(@PathVariable UUID eventId) {
        List<Order> orders = orderRepository.findByEventIdWithUserAndEvent(eventId);
        List<AdminBookingResponse> responses = orders.stream().map(o -> {
            String email = o.getUser().getEmail();
            String name = email.contains("@") ? email.split("@")[0] : email;
            return AdminBookingResponse.builder()
                    .orderId(o.getId())
                    .userId(o.getUser().getId())
                    .customerEmail(email)
                    .customerName(name)
                    .eventId(o.getEvent().getId())
                    .eventName(o.getEvent().getName())
                    .venue(o.getEvent().getVenue())
                    .ticketCount(o.getTicketCount())
                    .totalAmount(o.getTotalAmount())
                    .status(o.getStatus())
                    .createdAt(o.getCreatedAt())
                    .build();
        }).toList();

        return ResponseEntity.ok(ApiResponse.ok("Event bookings retrieved", responses));
    }

    @GetMapping("/activities")
    @Transactional(readOnly = true)
    @Operation(summary = "Get Recent User Activity Logs", description = "Returns recent database-persisted user activities and security audit events")
    public ResponseEntity<ApiResponse<List<AdminActivityLogResponse>>> getActivities() {
        List<AdminActivityLogResponse> responses = activityLogService.getRecentActivities().stream()
                .map(a -> AdminActivityLogResponse.builder()
                        .id(a.getId())
                        .userId(a.getUserId())
                        .userEmail(a.getUserEmail())
                        .action(a.getAction())
                        .details(a.getDetails())
                        .status(a.getStatus())
                        .ipAddress(a.getIpAddress())
                        .createdAt(a.getCreatedAt())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("User activities retrieved", responses));
    }
}
