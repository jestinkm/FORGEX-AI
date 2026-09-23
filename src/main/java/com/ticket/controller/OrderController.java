package com.ticket.controller;

import com.ticket.exception.QueueAdmissionException;
import com.ticket.model.dto.ApiResponse;
import com.ticket.model.dto.ConfirmOrderRequest;
import com.ticket.model.dto.HoldTicketRequest;
import com.ticket.model.dto.HoldTicketResponse;
import com.ticket.model.dto.OrderResponse;
import com.ticket.model.entity.User;
import com.ticket.security.WaitingRoomInterceptor;
import com.ticket.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Order & Inventory Management", description = "Ticket hold, optimistic inventory locking, and confirmation")
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/hold")
    @Operation(summary = "Hold tickets temporarily", description = "Reserves tickets for 10 minutes using optimistic locking. Requires X-Admission-Token.")
    public ResponseEntity<ApiResponse<HoldTicketResponse>> holdTickets(
            @Valid @RequestBody HoldTicketRequest request,
            @Parameter(hidden = true) @RequestHeader(value = "X-Admission-Token", required = false) String admissionToken,
            @AuthenticationPrincipal User user,
            HttpServletRequest servletRequest) {

        UUID admissionUserId = (UUID) servletRequest.getAttribute(WaitingRoomInterceptor.ATTR_ADMISSION_USER_ID);
        UUID admissionEventId = (UUID) servletRequest.getAttribute(WaitingRoomInterceptor.ATTR_ADMISSION_EVENT_ID);

        if (admissionUserId != null && !admissionUserId.equals(user.getId())) {
            throw new QueueAdmissionException("Admission token does not belong to the currently logged in user.");
        }
        if (admissionEventId != null && !admissionEventId.equals(request.getEventId())) {
            throw new QueueAdmissionException("Admission token was issued for a different event.");
        }

        HoldTicketResponse response = orderService.holdTickets(user.getId(), request.getEventId(), request.getTicketCount(), request.getSelectedSeats());
        return ResponseEntity.ok(ApiResponse.ok("Tickets successfully held for checkout", response));
    }

    @PostMapping("/confirm")
    @Operation(summary = "Confirm order", description = "Finalizes the ticket purchase after payment is successful.")
    public ResponseEntity<ApiResponse<OrderResponse>> confirmOrder(
            @Valid @RequestBody ConfirmOrderRequest request,
            @Parameter(hidden = true) @RequestHeader(value = "X-Admission-Token", required = false) String admissionToken) {

        OrderResponse response = orderService.confirmOrder(request.getOrderId(), request.getPaymentId());
        return ResponseEntity.ok(ApiResponse.ok("Order successfully confirmed", response));
    }

    @GetMapping("/{orderId}")
    @Operation(summary = "Get order details", description = "Returns current order details and status")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrder(@PathVariable UUID orderId) {
        OrderResponse response = orderService.getOrder(orderId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
