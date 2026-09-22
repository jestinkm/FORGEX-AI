# TicketFlow Flash-Sale Frontend & Virtual Waiting Room Client

A high-performance React + TypeScript frontend designed for flash sales and traffic surges, featuring a resilient Virtual Waiting Room experience, dynamic CAPTCHA challenges, optimistic checkout holding, and idempotent payment processing.

---

## 🚀 Key Features

1. **Virtual Waiting Room Experience**
   - Full-screen "You're in line" experience with live queue position number, animated movement bar, and estimated wait time countdown.
   - Resilient `useQueueSocket` hook supporting STOMP over WebSocket (`/ws/queue`), Server-Sent Events (SSE) fallback, and exponential-backoff polling fallback.
   - Connection health indicator (`Connected`, `Reconnecting`, `Polling fallback`).
   - "Do not close this tab" warning and auto-redirection immediately upon queue admission.

2. **CAPTCHA Anti-Bot Verification**
   - Dynamic math/puzzle challenge verifying humanity prior to queue entry.
   - Integrated developer bypass token for swift testing (`BYPASS_FOR_TESTING`).

3. **Checkout & Hold Expiry Countdown**
   - Protected by `X-Admission-Token` (persisted in `sessionStorage` so it automatically clears on tab close).
   - 10-minute hold countdown timer with dynamic color shifting (Green $\rightarrow$ Amber $\rightarrow$ Pulsing Red).
   - Automatic session expiration alerts and unconfirmed ticket return.

4. **Idempotent Payment Engine**
   - Client-generated UUID `Idempotency-Key` persisted across retries.
   - Prevents double-clicks and double-charging.
   - Distinct success, decline, and timeout states.

5. **E-Ticket Confirmation**
   - Confetti burst celebration.
   - Digital QR code pass with printing and PDF save functionality.

6. **Edge-Case Handlers**
   - Global `HTTP 429 Too Many Requests` modal with live countdown timer based on the `Retry-After` header.
   - Sold-out state with waitlist notification signup.
   - Code-split routes (`React.lazy` + `Suspense`) for optimal bundle loading during massive traffic spikes.

---

## 💻 Getting Started

### Prerequisites
- Node.js 18+ (Tested on Node 26 & npm 11)

### Installation
```bash
cd frontend
npm.cmd install
```

### Run Locally (Development Server)
```bash
npm.cmd run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm.cmd run build
```
Generates optimized static bundle in `frontend/dist`.
