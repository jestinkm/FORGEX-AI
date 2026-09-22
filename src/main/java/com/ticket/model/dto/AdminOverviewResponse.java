package com.ticket.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOverviewResponse {
    private int totalEvents;
    private long totalSeats;
    private long availableSeats;
    private long heldSeats;
    private long soldSeats;
    private BigDecimal totalRevenue;
    private long totalUsers;
    private List<AdminInventoryResponse> events;
    private List<AdminBookingResponse> recentBookings;
    private List<AdminActivityLogResponse> recentActivities;
}