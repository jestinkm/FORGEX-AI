-- ==============================================================================
-- FairSeat - Supabase PostgreSQL Database Schema
-- High-Concurrency Flash Sale Ticketing Platform with Blockchain Verification
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'ROLE_USER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Venues Table
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    total_capacity INT NOT NULL DEFAULT 10000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_tickets INT NOT NULL DEFAULT 10000,
    cost_per_seat DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Sections Table (Admin-Configured Seating Sections)
CREATE TABLE IF NOT EXISTS sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    section_code VARCHAR(50) NOT NULL, -- e.g. 'VIP', 'PREMIUM', 'REGULAR', 'STANDING'
    section_name VARCHAR(100) NOT NULL,
    section_tier VARCHAR(50) NOT NULL DEFAULT 'REGULAR',
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    display_order INT DEFAULT 1,
    color_theme VARCHAR(50) DEFAULT 'emerald',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Rows Table
CREATE TABLE IF NOT EXISTS rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    row_label VARCHAR(10) NOT NULL, -- e.g. 'A', 'B', 'C'
    seat_count INT NOT NULL DEFAULT 10,
    aisle_positions INT[] DEFAULT ARRAY[]::INT[], -- column indices where aisle gap exists
    display_order INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Seats Table (Admin Seating Designer Model)
CREATE TABLE IF NOT EXISTS seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    row_id UUID REFERENCES rows(id) ON DELETE CASCADE,
    seat_code VARCHAR(50) NOT NULL, -- e.g. 'VIP-A01', 'PRE-B05', 'REG-C10'
    row_label VARCHAR(10) NOT NULL,
    seat_number INT NOT NULL,
    seat_type VARCHAR(50) DEFAULT 'REGULAR', -- 'VIP', 'PREMIUM', 'REGULAR', 'ACCESSIBLE'
    price DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    status VARCHAR(50) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED'
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    is_accessible BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_event_seat_code UNIQUE (event_id, seat_code)
);

-- 7. Seat Inventory Table (Optimistic Locking & Concurrency Control)
CREATE TABLE IF NOT EXISTS seat_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    total_seats INT NOT NULL DEFAULT 10000,
    available_seats INT NOT NULL DEFAULT 10000,
    held_seats INT NOT NULL DEFAULT 0,
    sold_seats INT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0, -- Optimistic locking counter
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_inventory_balance CHECK (available_seats + held_seats + sold_seats = total_seats)
);

-- 8. Holds Table (Time-Limited Atomic Seat Holds)
CREATE TABLE IF NOT EXISTS holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    seat_numbers TEXT NOT NULL, -- comma-separated e.g. 'VIP-A01, VIP-A02'
    ticket_count INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'HELD', -- 'HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED'
    held_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    seat_numbers TEXT,
    ticket_count INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'EXPIRED', 'CANCELLED'
    hold_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    seat_id UUID REFERENCES seats(id) ON DELETE SET NULL,
    seat_code VARCHAR(50) NOT NULL,
    section_name VARCHAR(100),
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Payments Table (Idempotent Payments)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'UPI',
    provider_reference VARCHAR(255) NOT NULL, -- e.g. 12-digit UTR
    status VARCHAR(50) DEFAULT 'SUCCESS', -- 'PENDING', 'SUCCESS', 'FAILED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Tickets Table (Digital Ticket with Gate Verification)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'FS-2026-8A72F'
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_code VARCHAR(50) NOT NULL,
    section_name VARCHAR(100),
    row_label VARCHAR(10),
    seat_number INT,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE', 'USED', 'CANCELLED'
    admitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Ticket Verification & Entrance Gate Log (Anti-Counterfeit)
CREATE TABLE IF NOT EXISTS ticket_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    ticket_code VARCHAR(50) NOT NULL,
    gate_number VARCHAR(50) DEFAULT 'GATE-A',
    scanner_agent_id VARCHAR(100),
    scan_result VARCHAR(50) NOT NULL, -- 'VALID', 'ALREADY_USED', 'INVALID'
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(50)
);

-- 14. Blockchain Blocks Table (Cryptographic Immutable Ledger)
CREATE TABLE IF NOT EXISTS blockchain_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index BIGINT NOT NULL,
    block_hash VARCHAR(64) UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    order_id UUID,
    event_id UUID,
    event_name VARCHAR(255),
    venue VARCHAR(255),
    buyer_name VARCHAR(255),
    buyer_email VARCHAR(255),
    buyer_wallet VARCHAR(64),
    seat_numbers VARCHAR(255),
    ticket_count INT,
    total_amount DECIMAL(10, 2),
    payment_utr VARCHAR(64),
    token_id VARCHAR(100),
    contract_address VARCHAR(64),
    nonce BIGINT NOT NULL,
    merkle_root VARCHAR(64),
    signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. Admin Actions Audit Log
CREATE TABLE IF NOT EXISTS admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email VARCHAR(255) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    details TEXT,
    target_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Waiting Room & Rate Limits Table
CREATE TABLE IF NOT EXISTS waiting_room (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    queue_rank BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'WAITING',
    admission_token TEXT,
    admitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_event_user_queue UNIQUE (event_id, user_id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
    key VARCHAR(255) PRIMARY KEY,
    hits INT NOT NULL DEFAULT 1,
    window_expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- INDEXES FOR CONCURRENCY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_seats_event_status ON seats(event_id, status);
CREATE INDEX IF NOT EXISTS idx_seats_seat_code ON seats(seat_code);
CREATE INDEX IF NOT EXISTS idx_holds_expires_at ON holds(expires_at) WHERE status = 'HELD';
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_blockchain_order ON blockchain_blocks(order_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_hash ON blockchain_blocks(block_hash);

-- SEED DATA
INSERT INTO venues (id, name, city, address, total_capacity)
VALUES ('11111111-1111-1111-1111-111111111111', 'Main Arena Stadium', 'Mumbai', 'Sector 5, Sports City', 10000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, venue_id, name, description, event_date, total_tickets, cost_per_seat, status)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Coldplay: Music of the Spheres World Tour 2026', 'High-concurrency stadium concert flash-sale with FairSeat dynamic seating', NOW() + INTERVAL '30 days', 10000, 1.00, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO seat_inventory (event_id, total_seats, available_seats, held_seats, sold_seats, version)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10000, 10000, 0, 0, 0)
ON CONFLICT (event_id) DO NOTHING;

INSERT INTO sections (id, event_id, section_code, section_name, section_tier, base_price, display_order, color_theme)
VALUES 
    ('22222222-2222-2222-2222-222222222221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'VIP', 'VIP Platinum Lounge', 'VIP', 3000.00, 1, 'purple'),
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PREMIUM', 'Club Deck Executive', 'PREMIUM', 1800.00, 2, 'cyan'),
    ('22222222-2222-2222-2222-222222222223', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'REGULAR', 'General Pitch Standing', 'REGULAR', 800.00, 3, 'emerald')
ON CONFLICT (id) DO NOTHING;
