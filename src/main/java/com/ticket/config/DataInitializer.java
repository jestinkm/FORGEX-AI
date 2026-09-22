package com.ticket.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    public static final UUID COLDPLAY_EVENT_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    public static final UUID TAYLOR_EVENT_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    @Override
    public void run(String... args) {
        try {
            // 1. Seed Users if table empty
            Integer userCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
            if (userCount != null && userCount == 0) {
                String encodedPassword = passwordEncoder.encode("Password123!");
                Timestamp now = Timestamp.from(Instant.now());

                jdbcTemplate.update(
                        "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                        UUID.fromString("11111111-1111-1111-1111-111111111111"),
                        "admin@ticketflow.com",
                        encodedPassword,
                        "ROLE_ADMIN",
                        now
                );

                jdbcTemplate.update(
                        "INSERT INTO users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
                        UUID.fromString("22222222-2222-2222-2222-222222222222"),
                        "buyer1@ticketflow.com",
                        encodedPassword,
                        "ROLE_USER",
                        now
                );

                log.info("DataInitializer: Seeded default users (admin@ticketflow.com, buyer1@ticketflow.com)");
            }

            // 2. Seed Events & Inventories if table empty
            Integer eventCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM events", Integer.class);
            if (eventCount != null && eventCount == 0) {
                Timestamp now = Timestamp.from(Instant.now());
                Timestamp coldplayStart = Timestamp.from(Instant.now().plus(30, ChronoUnit.DAYS));
                Timestamp taylorStart = Timestamp.from(Instant.now().plus(45, ChronoUnit.DAYS));

                // Insert Coldplay event
                jdbcTemplate.update(
                        "INSERT INTO events (id, name, description, venue, start_time, total_tickets, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        COLDPLAY_EVENT_ID,
                        "Coldplay: Music of the Spheres World Tour 2026",
                        "Exclusive stadium flash sale. Max 4 tickets per user. High demand expected.",
                        "Wembley Stadium, London",
                        coldplayStart,
                        50000,
                        "ACTIVE",
                        now
                );

                // Insert Coldplay inventory
                jdbcTemplate.update(
                        "INSERT INTO ticket_inventories (id, event_id, available_count, held_count, sold_count, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        UUID.fromString("99999999-9999-9999-9999-999999999999"),
                        COLDPLAY_EVENT_ID,
                        50000,
                        0,
                        0,
                        0L,
                        now
                );

                // Insert Taylor Swift event
                jdbcTemplate.update(
                        "INSERT INTO events (id, name, description, venue, start_time, total_tickets, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        TAYLOR_EVENT_ID,
                        "Taylor Swift: The Eras Tour Final",
                        "VIP and General Admission stadium flash sale.",
                        "SoFi Stadium, Los Angeles",
                        taylorStart,
                        25000,
                        "ACTIVE",
                        now
                );

                // Insert Taylor Swift inventory
                jdbcTemplate.update(
                        "INSERT INTO ticket_inventories (id, event_id, available_count, held_count, sold_count, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        UUID.fromString("88888888-8888-8888-8888-888888888888"),
                        TAYLOR_EVENT_ID,
                        25000,
                        0,
                        0,
                        0L,
                        now
                );

                log.info("DataInitializer: Seeded flash-sale events & ticket inventories");
            }
        } catch (Exception e) {
            log.error("DataInitializer failed to seed initial data: {}", e.getMessage(), e);
        }
    }
}
