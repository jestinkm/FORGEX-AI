package com.ticket.controller;

import com.ticket.model.dto.ApiResponse;
import com.ticket.model.dto.SeatLayoutDTOs.*;
import com.ticket.service.SeatLayoutService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "FairSeat Seating & Gate Verification", description = "Dynamic seating designer layout, real-time seat matrix, and entrance gate ticket verification")
public class SeatLayoutController {

    private final SeatLayoutService seatLayoutService;

    @GetMapping("/seating/layout/{eventId}")
    @Operation(summary = "Get Dynamic Seating Layout", description = "Returns sections, rows, seats, aisles, and real-time status (Available, Held, Booked, Blocked)")
    public ResponseEntity<ApiResponse<SeatingLayoutResponse>> getSeatingLayout(@PathVariable UUID eventId) {
        SeatingLayoutResponse layout = seatLayoutService.getSeatingLayout(eventId);
        return ResponseEntity.ok(ApiResponse.ok("Seating layout retrieved", layout));
    }

    @PostMapping("/seating/admin/layout/{eventId}")
    @Operation(summary = "Save Admin-Designed Seating Layout", description = "Persists admin-configured sections, rows, seat counts, and pricing")
    public ResponseEntity<ApiResponse<SeatingLayoutResponse>> saveLayout(
            @PathVariable UUID eventId,
            @RequestBody List<SectionDto> sections) {
        SeatingLayoutResponse updated = seatLayoutService.saveLayout(eventId, sections);
        return ResponseEntity.ok(ApiResponse.ok("Seating layout saved successfully", updated));
    }

    @PostMapping("/seating/admin/block")
    @Operation(summary = "Toggle Block Seat", description = "Blocks or unblocks a seat from ticket sales")
    public ResponseEntity<ApiResponse<Boolean>> toggleBlockSeat(@RequestBody BlockSeatRequest request) {
        boolean status = seatLayoutService.toggleBlockSeat(request.getEventId(), request.getSeatCode(), request.isBlocked());
        return ResponseEntity.ok(ApiResponse.ok(status ? "Seat blocked" : "Seat unblocked", status));
    }

    @PostMapping("/seating/admin/price")
    @Operation(summary = "Update Section Price", description = "Sets base price for a seating section")
    public ResponseEntity<ApiResponse<Boolean>> updateSectionPrice(@RequestBody UpdatePriceRequest request) {
        String secCode = request.getSectionCode() != null ? request.getSectionCode() : request.getSectionId();
        BigDecimal price = request.getPrice() != null ? request.getPrice() : request.getBasePrice();
        boolean success = seatLayoutService.updateSectionPrice(request.getEventId(), secCode, price);
        return ResponseEntity.ok(ApiResponse.ok("Section price updated", success));
    }

    @GetMapping("/tickets/verify/{query}")
    @Operation(summary = "Gate Ticket Verification", description = "Inspects ticket against Supabase and Blockchain ledger")
    public ResponseEntity<ApiResponse<TicketVerifyResponse>> verifyTicket(@PathVariable String query) {
        TicketVerifyResponse response = seatLayoutService.verifyTicket(query);
        return ResponseEntity.ok(ApiResponse.ok("Ticket verification completed", response));
    }

    @PostMapping("/tickets/admit/{query}")
    @Operation(summary = "Admit Attendee at Gate", description = "Marks ticket as USED. Rejects if ticket has already been scanned.")
    public ResponseEntity<ApiResponse<TicketVerifyResponse>> admitAttendee(@PathVariable String query) {
        try {
            TicketVerifyResponse response = seatLayoutService.admitAttendee(query);
            return ResponseEntity.ok(ApiResponse.ok("Attendee admitted successfully", response));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.<TicketVerifyResponse>builder()
                    .success(false)
                    .message(e.getMessage())
                    .build());
        }
    }
}
