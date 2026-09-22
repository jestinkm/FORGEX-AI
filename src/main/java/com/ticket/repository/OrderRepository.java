package com.ticket.repository;

import com.ticket.model.entity.Order;
import com.ticket.model.enums.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {

    List<Order> findByUserId(UUID userId);

    @Query("SELECT o FROM Order o JOIN FETCH o.event WHERE o.status = :status AND o.holdExpiresAt < :now")
    List<Order> findExpiredPendingOrders(
        @Param("status") OrderStatus status,
        @Param("now") Instant now
    );

    @Query("SELECT o FROM Order o JOIN FETCH o.user JOIN FETCH o.event ORDER BY o.createdAt DESC")
    List<Order> findAllWithUserAndEvent();

    @Query("SELECT o FROM Order o JOIN FETCH o.user JOIN FETCH o.event WHERE o.event.id = :eventId ORDER BY o.createdAt DESC")
    List<Order> findByEventIdWithUserAndEvent(@Param("eventId") UUID eventId);
}
