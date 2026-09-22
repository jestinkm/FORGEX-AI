package com.ticket.repository;

import com.ticket.model.entity.TicketInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketInventoryRepository extends JpaRepository<TicketInventory, UUID> {

    @Query("SELECT ti FROM TicketInventory ti JOIN FETCH ti.event WHERE ti.event.id = :eventId")
    Optional<TicketInventory> findByEventId(@Param("eventId") UUID eventId);

    /**
     * Direct atomic update with optimistic locking guard against race conditions.
     */
    @Modifying
    @Query("""
        UPDATE TicketInventory ti
        SET ti.availableCount = ti.availableCount - :count,
            ti.heldCount = ti.heldCount + :count,
            ti.version = ti.version + 1,
            ti.updatedAt = CURRENT_INSTANT
        WHERE ti.event.id = :eventId
          AND ti.availableCount >= :count
          AND ti.version = :version
    """)
    int holdTicketsWithVersion(
        @Param("eventId") UUID eventId,
        @Param("count") int count,
        @Param("version") long version
    );

    /**
     * Release held tickets back to available count (e.g. after hold expiration or cancellation).
     */
    @Modifying
    @Query("""
        UPDATE TicketInventory ti
        SET ti.availableCount = ti.availableCount + :count,
            ti.heldCount = ti.heldCount - :count,
            ti.version = ti.version + 1,
            ti.updatedAt = CURRENT_INSTANT
        WHERE ti.event.id = :eventId
          AND ti.heldCount >= :count
    """)
    int releaseHeldTickets(
        @Param("eventId") UUID eventId,
        @Param("count") int count
    );

    /**
     * Finalize held tickets into sold count upon successful payment confirmation.
     */
    @Modifying
    @Query("""
        UPDATE TicketInventory ti
        SET ti.heldCount = ti.heldCount - :count,
            ti.soldCount = ti.soldCount + :count,
            ti.version = ti.version + 1,
            ti.updatedAt = CURRENT_INSTANT
        WHERE ti.event.id = :eventId
          AND ti.heldCount >= :count
    """)
    int confirmHeldTickets(
        @Param("eventId") UUID eventId,
        @Param("count") int count
    );
}
