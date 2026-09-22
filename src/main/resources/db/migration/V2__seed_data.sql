-- V2: Initial Seed Data for Testing and Flash-Sale Simulation

-- Password for all seed users: Password123!
-- BCrypt hash: $2a$10$wXjP0wS4qD8X0RkmWnC4Ie59h8D8zE0eL1oB2sC3mF4gH5jK6lM7n (standard test hash)
INSERT INTO users (id, email, password_hash, role, created_at)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'admin@ticketflow.com', '$2a$10$wXjP0wS4qD8X0RkmWnC4Ie59h8D8zE0eL1oB2sC3mF4gH5jK6lM7n', 'ROLE_ADMIN', CURRENT_TIMESTAMP),
    ('22222222-2222-2222-2222-222222222222', 'buyer1@ticketflow.com', '$2a$10$wXjP0wS4qD8X0RkmWnC4Ie59h8D8zE0eL1oB2sC3mF4gH5jK6lM7n', 'ROLE_USER', CURRENT_TIMESTAMP),
    ('33333333-3333-3333-3333-333333333333', 'buyer2@ticketflow.com', '$2a$10$wXjP0wS4qD8X0RkmWnC4Ie59h8D8zE0eL1oB2sC3mF4gH5jK6lM7n', 'ROLE_USER', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Flash-Sale Event: Coldplay Music of the Spheres World Tour 2026
INSERT INTO events (id, name, description, venue, start_time, total_tickets, status, created_at)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Coldplay World Tour 2026', 'Exclusive stadium flash sale. Max 4 tickets per user.', 'Wembley Stadium, London', CURRENT_TIMESTAMP + INTERVAL '30 days', 50000, 'ACTIVE', CURRENT_TIMESTAMP),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Taylor Swift The Eras Tour Final', 'VIP and General Admission flash sale.', 'SoFi Stadium, Los Angeles', CURRENT_TIMESTAMP + INTERVAL '45 days', 25000, 'ACTIVE', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Initial Inventory for the Flash-Sale Events
INSERT INTO ticket_inventories (id, event_id, available_count, held_count, sold_count, version, updated_at)
VALUES 
    ('99999999-9999-9999-9999-999999999999', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 50000, 0, 0, 0, CURRENT_TIMESTAMP),
    ('88888888-8888-8888-8888-888888888888', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 25000, 0, 0, 0, CURRENT_TIMESTAMP)
ON CONFLICT (event_id) DO NOTHING;
