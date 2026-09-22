# High-Concurrency Flash-Sale Ticket & Event Booking System

A distributed backend built with **Java 21** and **Spring Boot 3.3.x**, engineered to reliably handle **500,000+ registered users** with **10,000 to 100,000+ concurrent active sessions** during flash-sale style ticket drops without database saturation or race conditions.

---

## 🏛️ System Architecture

```
                                [100K+ Concurrent Flash-Sale Traffic]
                                                 │
                                                 ▼
               ┌──────────────────────────────────────────────────────────────────┐
               │    Correlation ID Filter (MDC) & Sliding Window Rate Limiter    │
               │           (Redis Lua Script: max 10 req/s per IP/User)          │
               └─────────────────────────────────┬────────────────────────────────┘
                                                 │
                                                 ▼
               ┌──────────────────────────────────────────────────────────────────┐
               │        Virtual Waiting Room (Redis Sorted Set ZSET FIFO)        │
               │   • Score = Arrival timestamp (ms)                               │
               │   • Absorbs traffic spike; 0 database queries                    │
               │   • Position & wait time polled or streamed via WebSocket / SSE  │
               └─────────────────────────────────┬────────────────────────────────┘
                                                 │
                                                 │ [Admission Worker: Controlled Batch e.g. 50/sec]
                                                 ▼
               ┌──────────────────────────────────────────────────────────────────┐
               │         Short-TTL Admission JWT Token Dispensed (10 min)         │
               │   • Stored in Redis (admission:token:{eventId}:{userId})        │
               │   • Enforced by WaitingRoomInterceptor on all checkout APIs      │
               └─────────────────────────────────┬────────────────────────────────┘
                                                 │
                                                 ▼
               ┌──────────────────────────────────────────────────────────────────┐
               │                    Checkout & Inventory Pipeline                 │
               │   1. POST /api/orders/hold                                       │
               │      • Optimistic Locking (@Version) with Jittered Retry         │
               │      • Temporary hold record with 10-min TTL in Redis & DB       │
               │   2. POST /api/payments/process                                  │
               │      • Idempotency-Key validation + Redis distributed lock       │
               │      • Mock gateway simulation (success/decline/timeout)         │
               │   3. POST /api/orders/confirm                                    │
               │      • Atomically transitions order to CONFIRMED                 │
               │      • Converts held inventory to sold                           │
               │      • Evicts hold cache & consumes admission token              │
               └──────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Concurrency & Race-Condition Safeguards

### 1. Redis Virtual Waiting Room (Traffic Absorber)
- **Problem**: 100,000 concurrent database queries for ticket inventory instantly saturate the connection pool and trigger deadlocks.
- **Solution**: Incoming traffic is held in an in-memory Redis Sorted Set (`ZSET`). Scores are set to arrival timestamps (`System.currentTimeMillis()`), guaranteeing strict FIFO ordering.
- **Controlled Admission**: The `QueueAdmissionWorker` background job runs every 1 second, atomically popping `N` users (e.g. 50 users/sec) using an atomic Lua script (`batch_admit_queue.lua`).
- **Cryptographic Admission Token**: Admitted users receive a signed JWT with a 10-minute expiry stored in Redis. The `WaitingRoomInterceptor` rejects any request to hold tickets or checkout that lacks a valid, active admission token.

### 2. Atomic Sliding Window Rate Limiting
- Evaluated entirely in Redis using an atomic Lua script (`sliding_window_rate_limiter.lua`).
- Removes outdated timestamps, computes instantaneous request frequency in the sliding window, and atomically updates counts.
- Violating requests are rejected with `HTTP 429 Too Many Requests` and a standard `Retry-After: 1` header.

### 3. Optimistic Locking on Ticket Inventory
- The `TicketInventory` table maintains a `@Version private Long version;` column.
- Under heavy checkout contention, concurrent updates that collide fail cleanly with `OptimisticLockingFailureException`.
- The `InventoryService` implements an automatic retry mechanism with jittered backoff (up to 3 attempts) to absorb burst collisions without failing legitimate buyers.
- **Invariant**: `available_count + held_count + sold_count == total_tickets` is maintained at all times. Overselling is mathematically impossible.

### 4. Idempotent Payment Processing
- Checkout payment endpoint accepts the standard `Idempotency-Key` header.
- Uses a two-tier deduplication check:
  1. **PostgreSQL Unique Constraint**: `payments(idempotency_key)` guarantees duplicate transactions cannot be committed to the database.
  2. **Redis Distributed Lock (`SETNX`)**: Prevents race conditions when a user double-clicks or an HTTP client auto-retries in flight. Repeated keys immediately return the cached original response without double-charging.

### 5. Automated Abandoned Hold Reclaimer
- If an admitted user holds tickets but abandons checkout or closes their browser, the `OrderCleanupScheduler` queries orders where `status = 'PENDING'` and `hold_expires_at < NOW()`.
- Expired holds are transitioned to `EXPIRED`, and tickets are atomically incremented back to `available_count`.

---

## 🚀 Quickstart with Docker Compose

### Prerequisites
- Docker Engine 24+ and Docker Compose v2+

### 1. Start the Full Stack (PostgreSQL, Redis, Backend, Prometheus)
```bash
docker-compose up -d --build
```

### 2. Verify System Health
```bash
curl http://localhost:8080/actuator/health
```

### 3. Access Swagger UI Documentation
Open your browser at:
**[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)**

### 4. Access Prometheus Metrics
Metrics endpoint:
**[http://localhost:8080/actuator/prometheus](http://localhost:8080/actuator/prometheus)**
Prometheus UI:
**[http://localhost:9090](http://localhost:9090)**

---

## 📡 API Endpoints Summary

### Authentication & Bot Defense
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user and receive JWT |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/captcha/challenge` | Generate dynamic math/puzzle CAPTCHA challenge |
| `POST` | `/api/captcha/verify` | Verify CAPTCHA and receive single-use token |

### Events & Waiting Room
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/events` | List active flash-sale events |
| `GET` | `/api/events/{id}` | Get event details |
| `POST` | `/api/queue/join/{eventId}` | Join FIFO waiting room queue |
| `GET` | `/api/queue/status/{eventId}` | Poll queue position, wait time, or admission token |
| `DELETE`| `/api/queue/leave/{eventId}` | Exit waiting room queue |
| `GET` | `/api/queue/stream/{eventId}` | Server-Sent Events (SSE) real-time queue updates |
| `WS` | `/ws/queue` | STOMP WebSocket connection for real-time notifications |

### Orders & Checkout (Protected by `X-Admission-Token`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/orders/hold` | Hold tickets for 10 minutes with optimistic locking |
| `POST` | `/api/payments/process` | Process payment with `Idempotency-Key` |
| `POST` | `/api/orders/confirm` | Finalize ticket purchase after payment |
| `GET` | `/api/orders/{id}` | Get order status |
| `POST` | `/api/payments/webhook` | Payment provider asynchronous webhook callback |

### Admin & Monitoring
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/queue-depth/{eventId}` | Real-time count of users waiting in Redis queue |
| `GET` | `/api/admin/inventory/{eventId}` | Real-time counts: available, held, sold, version |
| `POST` | `/api/admin/admission-rate` | Dynamically adjust admission batch size |

---

## 📊 High-Concurrency Load Testing with k6

A load testing script is included in `k6-flash-sale-test.js` to simulate realistic flash-sale traffic surges (up to hundreds/thousands of concurrent VUs):

### Running the Load Test:
```bash
# Install k6 (if not already installed)
# e.g., winget install k6 / brew install k6 / apt install k6

k6 run k6-flash-sale-test.js
```

### What the Load Test Validates:
1. **Queue Admission**: Surges of VUs enter the queue simultaneously; FIFO rank is respected.
2. **Rate Limiting**: Burst traffic triggers HTTP 429 backoff as expected.
3. **Zero Oversell**: At the end of the run, the sum of `available + held + sold` tickets matches the event's initial total with 0 inventory drift.

---

## ⚙️ Performance Tuning & Infrastructure

| Layer | Configuration | Description |
|---|---|---|
| **HikariCP** | `maximum-pool-size: 100`, `minimum-idle: 20` | Scaled to match database capacity without pool starvation |
| **Tomcat** | `threads.max: 200`, `max-connections: 10000` | Handles high-density concurrent keep-alive connections |
| **Java Virtual Threads** | `spring.threads.virtual.enabled: true` | Virtual threads (Java 21 Project Loom) enabled for non-blocking I/O throughput |
| **PostgreSQL** | `max_connections: 300`, `shared_buffers: 512MB` | Tuned connection pool and shared cache in `docker-compose.yml` |
| **Redis** | `maxmemory-policy: noeviction` | Prevents queue state eviction; persistent append-only log enabled |

# dd
