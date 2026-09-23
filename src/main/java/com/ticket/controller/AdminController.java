package com.ticket.controller;
 
import com.ticket.model.dto.*;
import com.ticket.model.dto.SeatLayoutDTOs.*;
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

import com.ticket.repository.UserActivityLogRepository;
import java.util.*;
import java.util.stream.Collectors;

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
    private final UserActivityLogRepository userActivityLogRepository;
    private final com.ticket.service.SeatLayoutService seatLayoutService;

    public static final BigDecimal DEFAULT_SEAT_COST = new BigDecimal("1.00");

    private String extractUserName(String email) {
        if (email == null || email.isBlank()) {
            return "Customer";
        }
        String prefix = email.contains("@") ? email.split("@")[0] : email;
        String cleaned = prefix.replaceAll("[._-]", " ").trim();
        if (cleaned.isEmpty()) return "Customer";
        StringBuilder sb = new StringBuilder();
        for (String word : cleaned.split("\\s+")) {
            if (!word.isEmpty()) {
                sb.append(Character.toUpperCase(word.charAt(0)))
                  .append(word.substring(1).toLowerCase())
                  .append(" ");
            }
        }
        return sb.toString().trim();
    }

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
                        .costPerSeat(event.getPricePerSeat() != null ? event.getPricePerSeat() : DEFAULT_SEAT_COST)
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
            String name = o.getUser().getDisplayName();
            bookingResponses.add(AdminBookingResponse.builder()
                    .orderId(o.getId())
                    .userId(o.getUser().getId())
                    .customerEmail(email)
                    .customerName(name)
                    .eventId(o.getEvent().getId())
                    .eventName(o.getEvent().getName())
                    .venue(o.getEvent().getVenue())
                    .ticketCount(o.getTicketCount())
                    .seatNumbers(o.getSeatNumbers())
                    .totalAmount(o.getTotalAmount())
                    .costPerSeat(o.getEvent() != null && o.getEvent().getPricePerSeat() != null ? o.getEvent().getPricePerSeat() : DEFAULT_SEAT_COST)
                    .status(o.getStatus())
                    .createdAt(o.getCreatedAt())
                    .build());
        }

        long totalUsers = userRepository.count();

        List<AdminActivityLogResponse> activityResponses = activityLogService.getRecentActivities().stream()
                .map(a -> AdminActivityLogResponse.builder()
                        .id(a.getId())
                        .userId(a.getUserId())
                        .userName(extractUserName(a.getUserEmail()))
                        .userEmail(a.getUserEmail())
                        .action(a.getAction())
                        .details(a.getDetails())
                        .status(a.getStatus())
                        .ipAddress(a.getIpAddress())
                        .createdAt(a.getCreatedAt())
                        .build())
                .toList();

        List<UserAccessFrequencyResponse> accessFrequencies = computeUserAccessFrequencies();

        AdminOverviewResponse overview = AdminOverviewResponse.builder()
                .totalEvents(allEvents.size())
                .totalSeats(totalSeats)
                .availableSeats(availableSeats)
                .heldSeats(heldSeats)
                .soldSeats(soldSeats)
                .totalRevenue(totalRevenue)
                .costPerSeat(DEFAULT_SEAT_COST)
                .totalUsers(totalUsers)
                .events(eventInventories)
                .recentBookings(bookingResponses)
                .recentActivities(activityResponses)
                .userAccessFrequencies(accessFrequencies)
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
            String name = o.getUser().getDisplayName();
            return AdminBookingResponse.builder()
                    .orderId(o.getId())
                    .userId(o.getUser().getId())
                    .customerEmail(email)
                    .customerName(name)
                    .eventId(o.getEvent().getId())
                    .eventName(o.getEvent().getName())
                    .venue(o.getEvent().getVenue())
                    .ticketCount(o.getTicketCount())
                    .seatNumbers(o.getSeatNumbers())
                    .totalAmount(o.getTotalAmount())
                    .costPerSeat(DEFAULT_SEAT_COST)
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
            String name = o.getUser().getDisplayName();
            return AdminBookingResponse.builder()
                    .orderId(o.getId())
                    .userId(o.getUser().getId())
                    .customerEmail(email)
                    .customerName(name)
                    .eventId(o.getEvent().getId())
                    .eventName(o.getEvent().getName())
                    .venue(o.getEvent().getVenue())
                    .ticketCount(o.getTicketCount())
                    .seatNumbers(o.getSeatNumbers())
                    .totalAmount(o.getTotalAmount())
                    .costPerSeat(DEFAULT_SEAT_COST)
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
                        .userName(extractUserName(a.getUserEmail()))
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

    @GetMapping("/user-access-frequencies")
    @Transactional(readOnly = true)
    @Operation(summary = "Get User Access Frequencies", description = "Returns platform access frequency metrics and activity breakdowns per user")
    public ResponseEntity<ApiResponse<List<UserAccessFrequencyResponse>>> getUserAccessFrequencies() {
        return ResponseEntity.ok(ApiResponse.ok("User access frequencies retrieved", computeUserAccessFrequencies()));
    }

    private List<UserAccessFrequencyResponse> computeUserAccessFrequencies() {
        List<com.ticket.model.entity.User> allUsers = userRepository.findAll();
        List<com.ticket.model.entity.UserActivityLog> allLogs = userActivityLogRepository.findAll();

        Map<String, List<com.ticket.model.entity.UserActivityLog>> logsByEmail = allLogs.stream()
                .filter(l -> l.getUserEmail() != null)
                .collect(Collectors.groupingBy(l -> l.getUserEmail().toLowerCase().trim()));

        Set<String> processedEmails = new HashSet<>();
        List<UserAccessFrequencyResponse> list = new ArrayList<>();

        for (com.ticket.model.entity.User u : allUsers) {
            String email = u.getEmail().toLowerCase().trim();
            processedEmails.add(email);
            List<com.ticket.model.entity.UserActivityLog> userLogs = logsByEmail.getOrDefault(email, Collections.emptyList());

            long totalAccess = userLogs.size();
            long logins = userLogs.stream().filter(l -> "USER_LOGIN".equalsIgnoreCase(l.getAction())).count();
            long captchas = userLogs.stream().filter(l -> "CAPTCHA_VERIFIED".equalsIgnoreCase(l.getAction())).count();
            long holds = userLogs.stream().filter(l -> "TICKET_HOLD".equalsIgnoreCase(l.getAction()) || "TICKETS_HELD".equalsIgnoreCase(l.getAction())).count();
            long payments = userLogs.stream().filter(l -> "UPI_PAYMENT_VERIFIED".equalsIgnoreCase(l.getAction()) || "PAYMENT_SUCCESS".equalsIgnoreCase(l.getAction())).count();
            long confirmed = userLogs.stream().filter(l -> "ORDER_CONFIRMED".equalsIgnoreCase(l.getAction())).count();

            Instant lastAccess = userLogs.isEmpty() ? u.getCreatedAt() : userLogs.stream()
                    .map(com.ticket.model.entity.UserActivityLog::getCreatedAt)
                    .max(Comparator.naturalOrder())
                    .orElse(u.getCreatedAt());

            String latestAction = userLogs.isEmpty() ? "ACCOUNT_ACTIVE" : userLogs.get(0).getAction();
            String lastIp = userLogs.isEmpty() ? "127.0.0.1" : userLogs.get(0).getIpAddress();

            String tier = totalAccess >= 8 ? "FLASH_SURGE_BUYER" : (totalAccess >= 3 ? "ACTIVE_VISITOR" : "STANDARD");

            list.add(UserAccessFrequencyResponse.builder()
                    .userId(u.getId())
                    .userName(u.getDisplayName())
                    .userEmail(u.getEmail())
                    .role(u.getRole().name())
                    .totalAccessCount(totalAccess)
                    .loginCount(logins)
                    .captchaCount(captchas)
                    .holdCount(holds)
                    .paymentCount(payments)
                    .confirmedCount(confirmed)
                    .lastAccessTime(lastAccess)
                    .latestAction(latestAction)
                    .lastIpAddress(lastIp != null ? lastIp : "127.0.0.1")
                    .accessFrequencyTier(tier)
                    .build());
        }

        for (Map.Entry<String, List<com.ticket.model.entity.UserActivityLog>> entry : logsByEmail.entrySet()) {
            if (!processedEmails.contains(entry.getKey())) {
                List<com.ticket.model.entity.UserActivityLog> userLogs = entry.getValue();
                long totalAccess = userLogs.size();
                long logins = userLogs.stream().filter(l -> "USER_LOGIN".equalsIgnoreCase(l.getAction())).count();
                long captchas = userLogs.stream().filter(l -> "CAPTCHA_VERIFIED".equalsIgnoreCase(l.getAction())).count();
                long holds = userLogs.stream().filter(l -> "TICKET_HOLD".equalsIgnoreCase(l.getAction()) || "TICKETS_HELD".equalsIgnoreCase(l.getAction())).count();
                long payments = userLogs.stream().filter(l -> "UPI_PAYMENT_VERIFIED".equalsIgnoreCase(l.getAction())).count();
                long confirmed = userLogs.stream().filter(l -> "ORDER_CONFIRMED".equalsIgnoreCase(l.getAction())).count();

                Instant lastAccess = userLogs.get(0).getCreatedAt();
                String tier = totalAccess >= 8 ? "FLASH_SURGE_BUYER" : (totalAccess >= 3 ? "ACTIVE_VISITOR" : "STANDARD");

                list.add(UserAccessFrequencyResponse.builder()
                        .userId(userLogs.get(0).getUserId())
                        .userName(extractUserName(entry.getKey()))
                        .userEmail(entry.getKey())
                        .role("ROLE_USER")
                        .totalAccessCount(totalAccess)
                        .loginCount(logins)
                        .captchaCount(captchas)
                        .holdCount(holds)
                        .paymentCount(payments)
                        .confirmedCount(confirmed)
                        .lastAccessTime(lastAccess)
                        .latestAction(userLogs.get(0).getAction())
                        .lastIpAddress(userLogs.get(0).getIpAddress())
                        .accessFrequencyTier(tier)
                        .build());
            }
        }

        list.sort((a, b) -> Long.compare(b.getTotalAccessCount(), a.getTotalAccessCount()));
        return list;
    }

    @PostMapping("/events")
    @Transactional
    @Operation(summary = "Create Event with BookMyShow Seating Layout", description = "Admin creates event with seat limit, frequency limits, price per seat, and cinema seating matrix")
    public ResponseEntity<ApiResponse<AdminInventoryResponse>> createAdminEvent(@RequestBody CreateAdminEventRequest req) {
        BigDecimal baseCost = req.getPricePerSeat() != null && req.getPricePerSeat().compareTo(BigDecimal.ZERO) > 0
                ? req.getPricePerSeat()
                : new BigDecimal("250.00");

        Event event = Event.builder()
                .name(req.getName() != null && !req.getName().isBlank() ? req.getName() : "New BookMyShow Premiere")
                .description(req.getDescription() != null ? req.getDescription() : "Cinema & Theatre Experience with Dolby Atmos")
                .venue(req.getVenue() != null && !req.getVenue().isBlank() ? req.getVenue() : "PVR INOX Screen 1 (Dolby Atmos)")
                .startTime(req.getStartTime() != null ? req.getStartTime() : Instant.now().plusSeconds(86400 * 7))
                .totalTickets(req.getTotalTickets() != null && req.getTotalTickets() > 0 ? req.getTotalTickets() : 114)
                .pricePerSeat(baseCost)
                .rateLimitPerMinute(req.getRateLimitPerMinute() != null ? req.getRateLimitPerMinute() : 30)
                .status(com.ticket.model.enums.EventStatus.ACTIVE)
                .build();

        Event savedEvent = eventRepository.save(event);

        // Initialize TicketInventory for this event
        TicketInventory inventory = TicketInventory.builder()
                .event(savedEvent)
                .availableCount(savedEvent.getTotalTickets())
                .heldCount(0)
                .soldCount(0)
                .version(0L)
                .updatedAt(Instant.now())
                .build();
        ticketInventoryRepository.save(inventory);

        // Generate and register BookMyShow Seating Layout
        List<SectionDto> layout = req.getSections() != null && !req.getSections().isEmpty()
                ? req.getSections()
                : seatLayoutService.createBookMyShowLayout(baseCost);
        seatLayoutService.registerEventLayout(savedEvent.getId(), layout);

        activityLogService.recordActivity(
                null,
                "admin@ticketflow.com",
                "ADMIN_EVENT_CREATED",
                String.format("Created Event '%s' (Venue: %s) with limit %d seats, cost ₹%s, and BookMyShow cinema seating layout",
                        savedEvent.getName(), savedEvent.getVenue(), savedEvent.getTotalTickets(), baseCost),
                "SUCCESS",
                "127.0.0.1"
        );

        AdminInventoryResponse item = AdminInventoryResponse.builder()
                .eventId(savedEvent.getId())
                .eventName(savedEvent.getName())
                .totalTickets(savedEvent.getTotalTickets())
                .availableCount(savedEvent.getTotalTickets())
                .heldCount(0)
                .soldCount(0)
                .costPerSeat(baseCost)
                .version(0L)
                .updatedAt(Instant.now())
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Event created successfully with BookMyShow seating layout", item));
    }
}
