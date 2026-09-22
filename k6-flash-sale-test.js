import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom Metrics
const queueJoinDuration = new Trend('queue_join_duration_ms');
const queueStatusDuration = new Trend('queue_status_duration_ms');
const holdTicketDuration = new Trend('hold_ticket_duration_ms');
const paymentDuration = new Trend('payment_duration_ms');
const orderSuccessRate = new Rate('order_success_rate');
const rateLimitedCount = new Counter('rate_limited_429_count');

// Test Configuration & Load Profile
export const options = {
    scenarios: {
        flash_sale_surge: {
            executor: 'ramping-vus',
            startVUs: 10,
            stages: [
                { duration: '15s', target: 200 },  // Traffic surge (waiting room flood)
                { duration: '30s', target: 500 },  // Peak concurrent checkout demand
                { duration: '15s', target: 100 },  // Cooldown
                { duration: '10s', target: 0 }
            ],
            gracefulRampDown: '10s',
        },
    },
    thresholds: {
        'http_req_duration': ['p(95)<300'], // 95% of requests should complete within 300ms
        'order_success_rate': ['rate>0.70'], // Expect >70% of admitted users to complete successfully
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
// Default seed event ID for Coldplay 2026 tour
const EVENT_ID = __ENV.EVENT_ID || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export default function () {
    const vuId = `vu_${__VU}_${__ITER}_${Date.now()}`;
    const userEmail = `user_${vuId}@loadtest.com`;
    const userPassword = 'Password123!';

    // -------------------------------------------------------------
    // Step 1: User Registration / Authentication
    // -------------------------------------------------------------
    const regPayload = JSON.stringify({
        email: userEmail,
        password: userPassword,
    });

    const regRes = http.post(`${BASE_URL}/api/auth/register`, regPayload, {
        headers: { 'Content-Type': 'application/json' },
    });

    if (regRes.status !== 200) {
        if (regRes.status === 429) rateLimitedCount.add(1);
        return;
    }

    const regData = JSON.parse(regRes.body);
    const authToken = regData.data.token;
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
    };

    // -------------------------------------------------------------
    // Step 2: Solve / Obtain CAPTCHA Token
    // -------------------------------------------------------------
    const captchaPayload = JSON.stringify({
        captchaId: 'test-captcha',
        solution: 'BYPASS_FOR_TESTING',
    });

    const captchaRes = http.post(`${BASE_URL}/api/captcha/verify`, captchaPayload, {
        headers: { 'Content-Type': 'application/json' },
    });

    let captchaToken = null;
    if (captchaRes.status === 200) {
        const captchaData = JSON.parse(captchaRes.body);
        captchaToken = captchaData.data.captchaToken;
    }

    // -------------------------------------------------------------
    // Step 3: Enter Virtual Waiting Room Queue
    // -------------------------------------------------------------
    const joinStart = Date.now();
    const joinPayload = JSON.stringify({ captchaToken: captchaToken });
    const joinRes = http.post(`${BASE_URL}/api/queue/join/${EVENT_ID}`, joinPayload, {
        headers: authHeaders,
    });
    queueJoinDuration.add(Date.now() - joinStart);

    if (joinRes.status === 429) {
        rateLimitedCount.add(1);
        return;
    }

    check(joinRes, {
        'joined queue or already admitted': (r) => r.status === 200,
    });

    const joinData = JSON.parse(joinRes.body).data;
    let admissionToken = joinData.admissionToken;

    // -------------------------------------------------------------
    // Step 4: Poll Queue Status until Admitted (Max 15 polling attempts)
    // -------------------------------------------------------------
    let attempts = 0;
    while (!admissionToken && attempts < 15) {
        attempts++;
        sleep(1); // Wait 1 second before polling rank

        const statusStart = Date.now();
        const statusRes = http.get(`${BASE_URL}/api/queue/status/${EVENT_ID}`, {
            headers: authHeaders,
        });
        queueStatusDuration.add(Date.now() - statusStart);

        if (statusRes.status === 200) {
            const statusData = JSON.parse(statusRes.body).data;
            if (statusData.status === 'ADMITTED' && statusData.admissionToken) {
                admissionToken = statusData.admissionToken;
                break;
            }
        } else if (statusRes.status === 429) {
            rateLimitedCount.add(1);
        }
    }

    if (!admissionToken) {
        // Did not gain admission in time during this iteration
        return;
    }

    const checkoutHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'X-Admission-Token': admissionToken,
    };

    // -------------------------------------------------------------
    // Step 5: Hold Tickets (Optimistic Locking)
    // -------------------------------------------------------------
    const holdStart = Date.now();
    const holdPayload = JSON.stringify({
        eventId: EVENT_ID,
        ticketCount: 2,
    });

    const holdRes = http.post(`${BASE_URL}/api/orders/hold`, holdPayload, {
        headers: checkoutHeaders,
    });
    holdTicketDuration.add(Date.now() - holdStart);

    if (holdRes.status !== 200) {
        if (holdRes.status === 429) rateLimitedCount.add(1);
        return;
    }

    const orderId = JSON.parse(holdRes.body).data.orderId;

    // -------------------------------------------------------------
    // Step 6: Process Payment with Idempotency Key
    // -------------------------------------------------------------
    const idempotencyKey = `pay_${orderId}_${Date.now()}`;
    const paymentStart = Date.now();
    const paymentPayload = JSON.stringify({
        orderId: orderId,
        paymentMethod: 'CREDIT_CARD',
    });

    const paymentRes = http.post(`${BASE_URL}/api/payments/process`, paymentPayload, {
        headers: {
            ...checkoutHeaders,
            'Idempotency-Key': idempotencyKey,
        },
    });
    paymentDuration.add(Date.now() - paymentStart);

    if (paymentRes.status !== 200) {
        return;
    }

    const paymentData = JSON.parse(paymentRes.body).data;
    if (paymentData.status !== 'SUCCESS') {
        return;
    }

    // -------------------------------------------------------------
    // Step 7: Confirm Order Finalization
    // -------------------------------------------------------------
    const confirmPayload = JSON.stringify({
        orderId: orderId,
        paymentId: paymentData.paymentId,
    });

    const confirmRes = http.post(`${BASE_URL}/api/orders/confirm`, confirmPayload, {
        headers: checkoutHeaders,
    });

    const success = check(confirmRes, {
        'order confirmed successfully': (r) => r.status === 200,
    });

    orderSuccessRate.add(success);
}
