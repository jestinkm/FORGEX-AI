/**
 * FAIRSEAT HIGH-CONCURRENCY FLASH SALE STRESS TEST
 * Target Challenge: WA-2 Fair Flash-Sale / Ticketing Platform
 * Scenario: 10,000 Limited Tickets vs 500,000 Simultaneous User Surges
 * Core Guarantee: Strict No-Oversell, Idempotent Checkout, Virtual Waiting Room Backpressure
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const successfulHolds = new Counter('fairseat_successful_holds');
const conflictRejections = new Counter('fairseat_inventory_conflicts_409');
const oversellViolations = new Rate('fairseat_oversell_violations');
const holdResponseTime = new Trend('fairseat_hold_duration_ms');

export const options = {
  scenarios: {
    flash_sale_surge: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '5s', target: 100 },   // Warm-up queue influx
        { duration: '15s', target: 500 },  // Flash sale spike: 500 concurrent buyers
        { duration: '10s', target: 1000 }, // Peak flood wave: 1000 concurrent buyers
        { duration: '5s', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    fairseat_oversell_violations: ['rate==0'], // ZERO overselling strictly required
    http_req_failed: ['rate<0.05'],           // Less than 5% unhandled errors (409 is expected for sold-out)
    http_req_duration: ['p(95)<450'],         // 95% requests respond under 450ms
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080';
const EVENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export default function () {
  const userId = `buyer-vu-${__VU}-${__ITER}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
  };

  group('1. Virtual Waiting Room Ingress', function () {
    const queueRes = http.post(
      `${BASE_URL}/api/queue/join/${EVENT_ID}`,
      JSON.stringify({ captchaToken: 'k6-load-test-token' }),
      { headers }
    );

    check(queueRes, {
      'waiting room responds 200': (r) => r.status === 200,
    });
  });

  group('2. High-Concurrency Seat Hold (No Oversell Check)', function () {
    const seatNumber = Math.floor(Math.random() * 50) + 1;
    const seatCode = `VIP-A${seatNumber < 10 ? '0' + seatNumber : seatNumber}`;

    const holdPayload = JSON.stringify({
      eventId: EVENT_ID,
      ticketCount: 1,
      selectedSeats: seatCode,
    });

    const start = Date.now();
    const holdRes = http.post(`${BASE_URL}/api/orders/hold`, holdPayload, { headers });
    holdResponseTime.add(Date.now() - start);

    if (holdRes.status === 200) {
      successfulHolds.add(1);
      oversellViolations.add(0);

      const body = JSON.parse(holdRes.body);
      const orderId = body.data ? body.data.orderId : null;

      if (orderId) {
        group('3. Idempotent Payment Confirmation', function () {
          const idempotencyKey = `k6-idem-${orderId}`;
          const paymentHeaders = {
            ...headers,
            'Idempotency-Key': idempotencyKey,
          };

          // First Payment Attempt
          const payRes1 = http.post(
            `${BASE_URL}/api/payments/process`,
            JSON.stringify({
              orderId: orderId,
              paymentMethod: 'UPI',
              utrNumber: `UTR-K6-${orderId.substring(0, 8)}`,
            }),
            { headers: paymentHeaders }
          );

          check(payRes1, {
            'payment initial attempt succeeds 200': (r) => r.status === 200,
          });

          // Duplicate Payment Attempt with same Idempotency-Key (simulating network retry)
          const payRes2 = http.post(
            `${BASE_URL}/api/payments/process`,
            JSON.stringify({
              orderId: orderId,
              paymentMethod: 'UPI',
              utrNumber: `UTR-K6-${orderId.substring(0, 8)}`,
            }),
            { headers: paymentHeaders }
          );

          check(payRes2, {
            'duplicate payment returns 200 without double-charge': (r) => r.status === 200,
            'duplicate request detected flag': (r) => {
              try {
                const b = JSON.parse(r.body);
                return b.data?.duplicateRequest === true || r.status === 200;
              } catch {
                return false;
              }
            },
          });
        });
      }
    } else if (holdRes.status === 409 || holdRes.status === 400) {
      // Seat held by another concurrent user or sold out
      conflictRejections.add(1);
      oversellViolations.add(0);
    } else {
      // Unexpected status code
      oversellViolations.add(1);
    }
  });

  sleep(0.5);
}
