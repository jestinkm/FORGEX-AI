package com.ticket.repository;

import com.ticket.model.entity.UserActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserActivityLogRepository extends JpaRepository<UserActivityLog, UUID> {
    List<UserActivityLog> findTop100ByOrderByCreatedAtDesc();
    List<UserActivityLog> findByUserEmailOrderByCreatedAtDesc(String userEmail);
}
