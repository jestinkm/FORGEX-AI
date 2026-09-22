package com.ticket.controller;

import com.ticket.exception.ResourceNotFoundException;
import com.ticket.model.dto.ApiResponse;
import com.ticket.model.entity.Event;
import com.ticket.model.enums.EventStatus;
import com.ticket.repository.EventRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Discovery and details of ticketed flash-sale events")
public class EventController {

    private final EventRepository eventRepository;

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
}
