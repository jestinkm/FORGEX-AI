package com.ticket.controller;

import com.ticket.exception.ResourceNotFoundException;
import com.ticket.model.dto.ApiResponse;
import com.ticket.model.entity.Event;
import com.ticket.model.enums.EventStatus;
import com.ticket.model.entity.Order;
import com.ticket.model.enums.OrderStatus;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Discovery and details of ticketed flash-sale events")
public class EventController {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;

    @GetMapping
    @Operation(summary = "List Active Events", description = "Returns all currently active flash-sale events available for booking")
    public ResponseEntity<ApiResponse<List<Event>>> getActiveEvents() {
        List<Event> events = eventRepository.findByStatus(EventStatus.ACTIVE);
        return ResponseEntity.ok(ApiResponse.ok("Active events retrieved", events));
    }

    @GetMapping("/{eventId}")
    @Operation(summary = "Get Event Details", description = "Retrieves information for a specific event by ID")
    public ResponseEntity<ApiResponse<Event>> getEventById(@PathVariable UUID eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + eventId));
        return ResponseEntity.ok(ApiResponse.ok(event));
    }

    @GetMapping("/{eventId}/reserved-seats")
    @Operation(summary = "Get Reserved Seat Numbers", description = "Retrieves seat numbers that are currently held or confirmed for an event")
    public ResponseEntity<ApiResponse<List<String>>> getReservedSeats(@PathVariable UUID eventId) {
        Instant now = Instant.now();
        List<Order> orders = orderRepository.findByEventIdWithUserAndEvent(eventId);
        List<String> reservedSeats = orders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CONFIRMED || 
                            (o.getStatus() == OrderStatus.PENDING && o.getHoldExpiresAt() != null && o.getHoldExpiresAt().isAfter(now)))
                .map(Order::getSeatNumbers)
                .filter(s -> s != null && !s.isBlank())
                .flatMap(s -> java.util.Arrays.stream(s.split(",")))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(String::toUpperCase)
                .distinct()
                .toList();

        return ResponseEntity.ok(ApiResponse.ok("Reserved seats retrieved", reservedSeats));
    }
}
