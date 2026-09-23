package com.ticket.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class SeatLayoutDTOs {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatDto {
        private String seatCode; // e.g. 'VIP-A01', 'PRE-B05', 'REG-C10'
        private String rowLabel; // 'A'
        private int seatNumber;  // 1
        private String seatType; // 'VIP', 'PREMIUM', 'REGULAR', 'ACCESSIBLE'
        private BigDecimal price;
        private String status;   // 'AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED'
        private int positionX;
        private int positionY;
        private boolean isAccessible;
        private boolean isBlocked;
        private boolean isAisle;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RowDto {
        private String rowLabel;
        private int seatCount;
        @Builder.Default
        private List<Integer> aislePositions = new ArrayList<>();
        @Builder.Default
        private List<SeatDto> seats = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionDto {
        private String sectionId;
        private String sectionCode; // 'VIP', 'PREMIUM', 'REGULAR', 'STANDING'
        private String sectionName; // 'VIP Platinum Lounge'
        private String sectionTier; // 'VIP', 'PREMIUM', 'REGULAR'
        private BigDecimal basePrice;
        private String colorTheme;  // 'purple', 'cyan', 'emerald'
        @Builder.Default
        private List<RowDto> rows = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SeatingLayoutResponse {
        private UUID eventId;
        private String eventName;
        private int totalSeats;
        private int availableSeats;
        private int heldSeats;
        private int bookedSeats;
        private int blockedSeats;
        @Builder.Default
        private List<SectionDto> sections = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SaveLayoutRequest {
        private UUID eventId;
        @Builder.Default
        private List<SectionDto> sections = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BlockSeatRequest {
        private UUID eventId;
        private String seatCode;
        private boolean blocked;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdatePriceRequest {
        private UUID eventId;
        private String sectionCode;
        private String sectionId;
        private BigDecimal price;
        private BigDecimal basePrice;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TicketVerifyResponse {
        private String ticketCode;      // e.g. 'FS-8A72F'
        private UUID orderId;
        private String eventName;
        private String venue;
        private Instant eventDate;
        private String customerName;
        private String customerEmail;
        private String seatCode;
        private String sectionName;
        private String rowLabel;
        private Integer seatNumber;
        private BigDecimal price;
        private String status;          // 'ACTIVE', 'USED', 'INVALID'
        private boolean blockchainVerified;
        private Long blockIndex;
        private String blockHash;
        private String buyerWallet;
        private Instant admittedAt;
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateAdminEventRequest {
        private String name;
        private String description;
        private String venue;
        private Instant startTime;
        private Integer totalTickets;
        private BigDecimal pricePerSeat;
        private Integer rateLimitPerMinute;
        private String seatingPattern; // 'BOOKMYSHOW_CINEMA', 'CONCERT_STADIUM', 'THEATRE'
        @Builder.Default
        private List<SectionDto> sections = new ArrayList<>();
    }
}
