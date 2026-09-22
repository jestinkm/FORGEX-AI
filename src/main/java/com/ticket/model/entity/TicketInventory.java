package com.ticket.model.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ticket_inventories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false, unique = true)
    private Event event;

    @Column(name = "available_count", nullable = false)
    private Integer availableCount;

    @Column(name = "held_count", nullable = false)
    private Integer heldCount;

    @Column(name = "sold_count", nullable = false)
    private Integer soldCount;

    /**
     * Optimistic locking version field.
     * Prevents race conditions and overselling during concurrent checkout requests.
     */
    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
        if (this.heldCount == null) this.heldCount = 0;
        if (this.soldCount == null) this.soldCount = 0;
    }
}
