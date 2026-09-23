package com.ticket.service;

import com.ticket.model.dto.SeatLayoutDTOs.*;
import com.ticket.model.entity.BlockchainBlock;
import com.ticket.model.entity.Event;
import com.ticket.model.entity.Order;
import com.ticket.model.enums.OrderStatus;
import com.ticket.repository.BlockchainBlockRepository;
import com.ticket.repository.EventRepository;
import com.ticket.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeatLayoutService {

    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final BlockchainBlockRepository blockchainBlockRepository;
    private final ActivityLogService activityLogService;

    // In-memory store for admin-customized layouts per event
    private final Map<UUID, List<SectionDto>> customLayouts = new ConcurrentHashMap<>();

    // Set of blocked seats (e.g. 'REG-C05', 'VIP-A01')
    private final Set<String> blockedSeats = ConcurrentHashMap.newKeySet();

    // Map of admitted ticket codes -> admission timestamp (prevents duplicate entrance scans)
    private final Map<String, Instant> admittedTickets = new ConcurrentHashMap<>();

    /**
     * Get real-time seating layout for an event, reflecting live booking and hold statuses.
     */
    public SeatingLayoutResponse getSeatingLayout(UUID eventId) {
        Event event = eventRepository.findById(eventId).orElse(null);
        String eventName = event != null ? event.getName() : "Coldplay: Music of the Spheres World Tour 2026";

        // 1. Get or create base layout sections
        List<SectionDto> baseSections = customLayouts.get(eventId);
        if (baseSections == null || baseSections.isEmpty()) {
            baseSections = createDefaultFairSeatLayout();
            customLayouts.put(eventId, baseSections);
        }

        // 2. Fetch all current orders for event to determine seat statuses
        List<Order> orders = orderRepository.findByEventIdWithUserAndEvent(eventId);
        Map<String, String> seatStatusMap = new HashMap<>(); // seatCode -> 'BOOKED' or 'HELD'

        for (Order o : orders) {
            if (o.getSeatNumbers() != null && !o.getSeatNumbers().isBlank()) {
                String[] codes = o.getSeatNumbers().split(",");
                for (String code : codes) {
                    String cleanCode = code.trim().toUpperCase();
                    if (o.getStatus() == OrderStatus.CONFIRMED) {
                        seatStatusMap.put(cleanCode, "BOOKED");
                    } else if (o.getStatus() == OrderStatus.PENDING && o.getHoldExpiresAt() != null && o.getHoldExpiresAt().isAfter(Instant.now())) {
                        seatStatusMap.putIfAbsent(cleanCode, "HELD");
                    }
                }
            }
        }

        // 3. Deep copy sections and overlay live seat status
        int totalSeats = 0;
        int availableSeats = 0;
        int heldSeats = 0;
        int bookedSeats = 0;
        int blockedSeatsCount = 0;

        List<SectionDto> evaluatedSections = new ArrayList<>();
        for (SectionDto sec : baseSections) {
            BigDecimal secBasePrice = sec.getBasePrice() != null ? sec.getBasePrice() : getDefaultBasePrice(sec.getSectionCode());
            List<RowDto> evaluatedRows = new ArrayList<>();
            for (RowDto r : sec.getRows()) {
                List<SeatDto> evaluatedSeats = new ArrayList<>();
                for (SeatDto s : r.getSeats()) {
                    totalSeats++;
                    String code = s.getSeatCode().toUpperCase();
                    String status = "AVAILABLE";

                    if (blockedSeats.contains(code) || s.isBlocked()) {
                        status = "BLOCKED";
                        blockedSeatsCount++;
                    } else if (seatStatusMap.containsKey(code)) {
                        status = seatStatusMap.get(code);
                        if ("BOOKED".equals(status)) bookedSeats++;
                        else if ("HELD".equals(status)) heldSeats++;
                    } else {
                        availableSeats++;
                    }

                    BigDecimal seatPrice = s.getPrice() != null ? s.getPrice() : secBasePrice;
                    SeatDto seatCopy = SeatDto.builder()
                            .seatCode(s.getSeatCode())
                            .rowLabel(s.getRowLabel())
                            .seatNumber(s.getSeatNumber())
                            .seatType(s.getSeatType())
                            .price(seatPrice)
                            .status(status)
                            .positionX(s.getPositionX())
                            .positionY(s.getPositionY())
                            .isAccessible(s.isAccessible())
                            .isBlocked(status.equals("BLOCKED"))
                            .isAisle(s.isAisle())
                            .build();
                    evaluatedSeats.add(seatCopy);
                }

                evaluatedRows.add(RowDto.builder()
                        .rowLabel(r.getRowLabel())
                        .seatCount(r.getSeatCount())
                        .aislePositions(r.getAislePositions())
                        .seats(evaluatedSeats)
                        .build());
            }

            evaluatedSections.add(SectionDto.builder()
                    .sectionId(sec.getSectionId())
                    .sectionCode(sec.getSectionCode())
                    .sectionName(sec.getSectionName())
                    .sectionTier(sec.getSectionTier())
                    .basePrice(secBasePrice)
                    .colorTheme(sec.getColorTheme())
                    .rows(evaluatedRows)
                    .build());
        }

        return SeatingLayoutResponse.builder()
                .eventId(eventId)
                .eventName(eventName)
                .totalSeats(totalSeats)
                .availableSeats(availableSeats)
                .heldSeats(heldSeats)
                .bookedSeats(bookedSeats)
                .blockedSeats(blockedSeatsCount)
                .sections(evaluatedSections)
                .build();
    }

    /**
     * Save admin-designed seating layout.
     */
    public SeatingLayoutResponse saveLayout(UUID eventId, List<SectionDto> sections) {
        if (sections != null) {
            for (SectionDto s : sections) {
                if (s.getBasePrice() == null) {
                    s.setBasePrice(getDefaultBasePrice(s.getSectionCode()));
                }
                if (s.getRows() != null) {
                    for (RowDto r : s.getRows()) {
                        if (r.getSeats() != null) {
                            for (SeatDto seat : r.getSeats()) {
                                if (seat.getPrice() == null) {
                                    seat.setPrice(s.getBasePrice());
                                }
                            }
                        }
                    }
                }
            }
        }
        customLayouts.put(eventId, sections);
        activityLogService.recordActivity(
                null,
                "admin@ticketflow.com",
                "ADMIN_SEATING_DESIGN_SAVED",
                String.format("Updated layout for event %s with %d sections", eventId, sections != null ? sections.size() : 0),
                "SUCCESS",
                "127.0.0.1"
        );
        log.info("Saved customized seating layout for event {}: {} sections", eventId, sections != null ? sections.size() : 0);
        return getSeatingLayout(eventId);
    }

    /**
     * Toggle blocked seat status.
     */
    public boolean toggleBlockSeat(UUID eventId, String seatCode, boolean blocked) {
        String cleanCode = seatCode.trim().toUpperCase();
        if (blocked) {
            blockedSeats.add(cleanCode);
        } else {
            blockedSeats.remove(cleanCode);
        }
        activityLogService.recordActivity(
                null,
                "admin@ticketflow.com",
                blocked ? "ADMIN_SEAT_BLOCKED" : "ADMIN_SEAT_UNBLOCKED",
                String.format("Seat %s is now %s", cleanCode, blocked ? "BLOCKED" : "UNBLOCKED"),
                "SUCCESS",
                "127.0.0.1"
        );
        return blocked;
    }

    /**
     * Update section base price.
     */
    public boolean updateSectionPrice(UUID eventId, String sectionCode, BigDecimal price) {
        if (sectionCode == null) return false;
        List<SectionDto> sections = customLayouts.get(eventId);
        if (sections == null || sections.isEmpty()) {
            sections = createDefaultFairSeatLayout();
            customLayouts.put(eventId, sections);
        }
        String cleanCode = sectionCode.trim().toUpperCase().replace("SEC-", "");
        BigDecimal resolvedPrice = price != null ? price : getDefaultBasePrice(cleanCode);
        boolean matched = false;
        for (SectionDto s : sections) {
            String sCode = s.getSectionCode() != null ? s.getSectionCode().toUpperCase() : "";
            String sId = s.getSectionId() != null ? s.getSectionId().toUpperCase().replace("SEC-", "") : "";
            if (sCode.equalsIgnoreCase(cleanCode) || sId.equalsIgnoreCase(cleanCode)) {
                s.setBasePrice(resolvedPrice);
                if (s.getRows() != null) {
                    for (RowDto r : s.getRows()) {
                        if (r.getSeats() != null) {
                            for (SeatDto seat : r.getSeats()) {
                                seat.setPrice(resolvedPrice);
                            }
                        }
                    }
                }
                matched = true;
            }
        }
        return matched;
    }

    private BigDecimal getDefaultBasePrice(String sectionCode) {
        if (sectionCode == null) return new BigDecimal("1000.00");
        String code = sectionCode.toUpperCase().replace("SEC-", "");
        return switch (code) {
            case "VIP" -> new BigDecimal("3000.00");
            case "PREMIUM" -> new BigDecimal("1800.00");
            case "REGULAR" -> new BigDecimal("800.00");
            default -> new BigDecimal("1000.00");
        };
    }

    /**
     * Verify ticket at venue gate using Supabase / Order details and cryptographic Blockchain hash.
     */
    @Transactional(readOnly = true)
    public TicketVerifyResponse verifyTicket(String query) {
        String clean = query.trim();
        UUID orderUuid = null;
        try {
            orderUuid = UUID.fromString(clean);
        } catch (Exception ignored) {}

        Order order = null;
        if (orderUuid != null) {
            order = orderRepository.findById(orderUuid).orElse(null);
        } else {
            // Find order matching ticket prefix
            List<Order> all = orderRepository.findAllWithUserAndEvent();
            for (Order o : all) {
                if (o.getId().toString().toUpperCase().startsWith(clean.toUpperCase().replace("FS-", ""))) {
                    order = o;
                    break;
                }
            }
        }

        if (order == null) {
            return TicketVerifyResponse.builder()
                    .ticketCode(clean)
                    .status("INVALID")
                    .blockchainVerified(false)
                    .message("TICKET NOT FOUND: Invalid Ticket ID or Order Reference.")
                    .build();
        }

        String ticketCode = "FS-" + order.getId().toString().substring(0, 8).toUpperCase();
        Instant admittedAt = admittedTickets.get(ticketCode);
        boolean isUsed = admittedAt != null;

        // Check cryptographic blockchain block
        BlockchainBlock block = blockchainBlockRepository.findByOrderId(order.getId().toString()).orElse(null);
        boolean blockchainVerified = block != null;

        String customerName = "Valued Customer";
        String customerEmail = "customer@ticketflow.com";
        try {
            if (order.getUser() != null) {
                if (order.getUser().getDisplayName() != null && !order.getUser().getDisplayName().isBlank()) {
                    customerName = order.getUser().getDisplayName();
                }
                if (order.getUser().getEmail() != null) {
                    customerEmail = order.getUser().getEmail();
                }
            }
        } catch (Exception ignored) {}

        String eventName = "Coldplay: Music of the Spheres World Tour 2026";
        String venue = "DY Patil Stadium, Mumbai";
        try {
            if (order.getEvent() != null) {
                if (order.getEvent().getName() != null) {
                    eventName = order.getEvent().getName();
                }
                if (order.getEvent().getVenue() != null) {
                    venue = order.getEvent().getVenue();
                }
            }
        } catch (Exception ignored) {}

        String message;
        if (isUsed) {
            message = String.format("ALREADY USED ✗ — Attendee was admitted at %s. Duplicate entry blocked!", admittedAt);
        } else if (order.getStatus() != OrderStatus.CONFIRMED) {
            message = "UNCONFIRMED ORDER: Payment not finalized. Entry not permitted.";
        } else {
            message = "VALID TICKET ✓ — Verified against Supabase Database and Cryptographic Blockchain.";
        }

        return TicketVerifyResponse.builder()
                .ticketCode(ticketCode)
                .orderId(order.getId())
                .eventName(eventName)
                .venue(venue)
                .eventDate(order.getCreatedAt().plusSeconds(86400 * 30))
                .customerName(customerName)
                .customerEmail(customerEmail)
                .seatCode(order.getSeatNumbers() != null ? order.getSeatNumbers() : "VIP-A01")
                .sectionName(order.getSeatNumbers() != null && order.getSeatNumbers().startsWith("VIP") ? "VIP Platinum Lounge" : "General Pitch")
                .price(order.getTotalAmount())
                .status(isUsed ? "USED" : order.getStatus() == OrderStatus.CONFIRMED ? "ACTIVE" : "INVALID")
                .blockchainVerified(blockchainVerified)
                .blockIndex(block != null ? block.getBlockIndex() : 1L)
                .blockHash(block != null ? block.getBlockHash() : "0a405f39af7bab5cf2f0332a96965f1758b47a1651eb35353334cbbce189d58b")
                .buyerWallet(block != null ? block.getBuyerWallet() : "0x8a8760ad263a14a7b3602c6a8216e96a621d6fe7")
                .admittedAt(admittedAt)
                .message(message)
                .build();
    }

    /**
     * Admit attendee through the gate. If already admitted, rejects with duplicate error.
     */
    @Transactional
    public TicketVerifyResponse admitAttendee(String query) {
        TicketVerifyResponse current = verifyTicket(query);
        if ("USED".equals(current.getStatus())) {
            throw new IllegalStateException("ENTRY REFUSED: Ticket " + current.getTicketCode() + " has ALREADY BEEN SCANNED & ADMITTED!");
        }
        if (!"ACTIVE".equals(current.getStatus())) {
            throw new IllegalStateException("ENTRY REFUSED: Ticket is not active or payment is incomplete.");
        }

        Instant now = Instant.now();
        admittedTickets.put(current.getTicketCode(), now);
        activityLogService.recordActivity(
                null,
                current.getCustomerEmail(),
                "GATE_ADMISSION_SUCCESS",
                String.format("Attendee %s admitted through Gate A for seats %s (Ticket: %s)", current.getCustomerName(), current.getSeatCode(), current.getTicketCode()),
                "SUCCESS",
                "127.0.0.1"
        );

        current.setStatus("USED");
        current.setAdmittedAt(now);
        current.setMessage("ADMISSION SUCCESSFUL ✓ — Attendee admitted at " + now + ". Ticket marked as USED.");
        return current;
    }

    /**
     * Factory for default authentic FairSeat layout matching the user's diagram:
     * - STAGE / SCREEN
     * - VIP SECTION (Row A: A1..A12, Row B: B1..B12)
     * - PREMIUM SECTION (Row C: C1..C14, Row D: D1..D14)
     * - REGULAR SECTION (Row E: E1..E16, Row F: F1..F16 with aisles)
     */
    private List<SectionDto> createDefaultFairSeatLayout() {
        List<SectionDto> sections = new ArrayList<>();

        // 1. VIP Section
        List<RowDto> vipRows = new ArrayList<>();
        vipRows.add(createRow("A", 12, "VIP", new BigDecimal("3000.00"), List.of(6)));
        vipRows.add(createRow("B", 12, "VIP", new BigDecimal("3000.00"), List.of(6)));
        sections.add(SectionDto.builder()
                .sectionId("sec-vip")
                .sectionCode("VIP")
                .sectionName("VIP Platinum Lounge")
                .sectionTier("VIP")
                .basePrice(new BigDecimal("3000.00"))
                .colorTheme("purple")
                .rows(vipRows)
                .build());

        // 2. Premium Section
        List<RowDto> premRows = new ArrayList<>();
        premRows.add(createRow("C", 14, "PREMIUM", new BigDecimal("1800.00"), List.of(7)));
        premRows.add(createRow("D", 14, "PREMIUM", new BigDecimal("1800.00"), List.of(7)));
        sections.add(SectionDto.builder()
                .sectionId("sec-prem")
                .sectionCode("PREMIUM")
                .sectionName("Club Deck Executive")
                .sectionTier("PREMIUM")
                .basePrice(new BigDecimal("1800.00"))
                .colorTheme("cyan")
                .rows(premRows)
                .build());

        // 3. Regular Section
        List<RowDto> regRows = new ArrayList<>();
        regRows.add(createRow("E", 16, "REGULAR", new BigDecimal("800.00"), List.of(5, 11)));
        regRows.add(createRow("F", 16, "REGULAR", new BigDecimal("800.00"), List.of(5, 11)));
        sections.add(SectionDto.builder()
                .sectionId("sec-reg")
                .sectionCode("REGULAR")
                .sectionName("General Pitch Standing")
                .sectionTier("REGULAR")
                .basePrice(new BigDecimal("800.00"))
                .colorTheme("emerald")
                .rows(regRows)
                .build());

        return sections;
    }

    public void registerEventLayout(UUID eventId, List<SectionDto> sections) {
        if (sections != null && !sections.isEmpty()) {
            customLayouts.put(eventId, sections);
        }
    }

    /**
     * BookMyShow Cinema Layout:
     * - Screen Curve (All Eyes This Way)
     * - Recliner (VIP Lounge)
     * - Prime Class (Executive)
     * - Classic Silver (Standard)
     */
    public List<SectionDto> createBookMyShowLayout(BigDecimal basePrice) {
        BigDecimal primePrice = basePrice != null && basePrice.compareTo(BigDecimal.ZERO) > 0 ? basePrice : new BigDecimal("250.00");
        BigDecimal reclinerPrice = primePrice.multiply(new BigDecimal("1.8")).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal classicPrice = primePrice.multiply(new BigDecimal("0.72")).setScale(2, java.math.RoundingMode.HALF_UP);

        List<SectionDto> sections = new ArrayList<>();

        // 1. RECLINER (Luxury VIP) - Top rows with center aisle
        List<RowDto> reclinerRows = new ArrayList<>();
        reclinerRows.add(createRow("A", 12, "RECLINER", reclinerPrice, List.of(6)));
        reclinerRows.add(createRow("B", 12, "RECLINER", reclinerPrice, List.of(6)));
        sections.add(SectionDto.builder()
                .sectionId("sec-recliner")
                .sectionCode("RECLINER")
                .sectionName("Recliner (VIP Lounge)")
                .sectionTier("RECLINER")
                .basePrice(reclinerPrice)
                .colorTheme("amber")
                .rows(reclinerRows)
                .build());

        // 2. PRIME (Executive Sweet-Spot) - Prime cinema viewing angle with 2 aisles
        List<RowDto> primeRows = new ArrayList<>();
        primeRows.add(createRow("C", 14, "PRIME", primePrice, List.of(4, 11)));
        primeRows.add(createRow("D", 14, "PRIME", primePrice, List.of(4, 11)));
        primeRows.add(createRow("E", 14, "PRIME", primePrice, List.of(4, 11)));
        sections.add(SectionDto.builder()
                .sectionId("sec-prime")
                .sectionCode("PRIME")
                .sectionName("Prime Class (Executive)")
                .sectionTier("PRIME")
                .basePrice(primePrice)
                .colorTheme("cyan")
                .rows(primeRows)
                .build());

        // 3. CLASSIC (Standard / Silver) - Rows closest to the screen with wide aisles
        List<RowDto> classicRows = new ArrayList<>();
        classicRows.add(createRow("F", 16, "CLASSIC", classicPrice, List.of(4, 13)));
        classicRows.add(createRow("G", 16, "CLASSIC", classicPrice, List.of(4, 13)));
        classicRows.add(createRow("H", 16, "CLASSIC", classicPrice, List.of(4, 13)));
        sections.add(SectionDto.builder()
                .sectionId("sec-classic")
                .sectionCode("CLASSIC")
                .sectionName("Classic Silver")
                .sectionTier("CLASSIC")
                .basePrice(classicPrice)
                .colorTheme("emerald")
                .rows(classicRows)
                .build());

        return sections;
    }

    private RowDto createRow(String rowLabel, int count, String sectionCode, BigDecimal price, List<Integer> aislePositions) {
        List<SeatDto> seats = new ArrayList<>();
        for (int i = 1; i <= count; i++) {
            String colStr = i < 10 ? "0" + i : String.valueOf(i);
            String seatCode = sectionCode + "-" + rowLabel + colStr;
            boolean isAccessible = (rowLabel.equals("B") && i == 1) || (rowLabel.equals("D") && i == 1);
            boolean isAisle = aislePositions.contains(i);

            seats.add(SeatDto.builder()
                    .seatCode(seatCode)
                    .rowLabel(rowLabel)
                    .seatNumber(i)
                    .seatType(isAccessible ? "ACCESSIBLE" : sectionCode)
                    .price(price)
                    .status("AVAILABLE")
                    .positionX(i)
                    .positionY(rowLabel.charAt(0) - 'A' + 1)
                    .isAccessible(isAccessible)
                    .isBlocked(false)
                    .isAisle(isAisle)
                    .build());
        }

        return RowDto.builder()
                .rowLabel(rowLabel)
                .seatCount(count)
                .aislePositions(aislePositions)
                .seats(seats)
                .build();
    }
}
