import { api } from './client';
import {
  ApiResponse,
  AuthResponse,
  EventItem,
  HoldTicketResponse,
  OrderResponse,
  PaymentResponse,
  QueueJoinResponse,
  QueueStatusResponse,
  AdminOverview,
  AdminBookingItem,
  AdminInventoryItem,
  BlockchainBlock,
  BlockchainVerifyResponse,
  BlockchainStats,
  SectionDto,
  SeatingLayoutResponse,
  TicketVerifyResponse,
  CreateAdminEventRequest,
} from '../types';

export const authApi = {
  register: async (email: string, password: string, name?: string) => {
    const res = await api.post<ApiResponse<AuthResponse>>('/api/auth/register', { email, password, name });
    return res.data.data;
  },
  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<AuthResponse>>('/api/auth/login', { email, password });
    return res.data.data;
  },
};

export const captchaApi = {
  getChallenge: async () => {
    const res = await api.get<ApiResponse<{ captchaId: string; challenge: string; expiresAt: number }>>('/api/captcha/challenge');
    return res.data.data;
  },
  verify: async (captchaId: string, solution: string) => {
    const res = await api.post<ApiResponse<{ captchaToken: string }>>('/api/captcha/verify', {
      captchaId,
      solution,
    });
    return res.data.data;
  },
};

export const eventsApi = {
  getAll: async () => {
    const res = await api.get<ApiResponse<EventItem[]>>('/api/events');
    return res.data.data;
  },
  getById: async (id: string) => {
    const res = await api.get<ApiResponse<EventItem>>(`/api/events/${id}`);
    return res.data.data;
  },
  getReservedSeats: async (eventId: string) => {
    const res = await api.get<ApiResponse<string[]>>(`/api/events/${eventId}/reserved-seats`);
    return res.data.data;
  },
};

export const queueApi = {
  join: async (eventId: string, captchaToken?: string) => {
    const res = await api.post<ApiResponse<QueueJoinResponse>>(`/api/queue/join/${eventId}`, {
      captchaToken,
    });
    return res.data.data;
  },
  getStatus: async (eventId: string) => {
    const res = await api.get<ApiResponse<QueueStatusResponse>>(`/api/queue/status/${eventId}`);
    return res.data.data;
  },
  leave: async (eventId: string) => {
    const res = await api.delete<ApiResponse<boolean>>(`/api/queue/leave/${eventId}`);
    return res.data.data;
  },
};

export const ordersApi = {
  hold: async (eventId: string, ticketCount: number, selectedSeats?: string) => {
    const res = await api.post<ApiResponse<HoldTicketResponse>>('/api/orders/hold', {
      eventId,
      ticketCount,
      selectedSeats,
    });
    return res.data.data;
  },
  confirm: async (orderId: string, paymentId: string) => {
    const res = await api.post<ApiResponse<OrderResponse>>('/api/orders/confirm', {
      orderId,
      paymentId,
    });
    return res.data.data;
  },
  getById: async (orderId: string) => {
    const res = await api.get<ApiResponse<OrderResponse>>(`/api/orders/${orderId}`);
    return res.data.data;
  },
};

export const paymentsApi = {
  process: async (
    orderId: string,
    idempotencyKey: string,
    paymentMethod = 'CREDIT_CARD',
    upiId?: string,
    utrNumber?: string
  ) => {
    const res = await api.post<ApiResponse<PaymentResponse>>(
      '/api/payments/process',
      { orderId, paymentMethod, upiId, utrNumber },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return res.data.data;
  },
};

export const adminApi = {
  getOverview: async () => {
    const res = await api.get<ApiResponse<AdminOverview>>('/api/admin/overview');
    return res.data.data;
  },
  getBookings: async (eventId?: string) => {
    const url = eventId ? `/api/admin/bookings/${eventId}` : '/api/admin/bookings';
    const res = await api.get<ApiResponse<AdminBookingItem[]>>(url);
    return res.data.data;
  },
  getActivities: async () => {
    const res = await api.get<ApiResponse<import('../types').AdminActivityLogItem[]>>('/api/admin/activities');
    return res.data.data;
  },
  getQueueDepth: async (eventId: string) => {
    const res = await api.get<ApiResponse<{ queueDepth: number }>>(`/api/admin/queue-depth/${eventId}`);
    return res.data.data;
  },
  getInventory: async (eventId: string) => {
    const res = await api.get<ApiResponse<AdminInventoryItem>>(`/api/admin/inventory/${eventId}`);
    return res.data.data;
  },
  tuneAdmissionRate: async (batchSize: number) => {
    const res = await api.post<ApiResponse<string>>('/api/admin/admission-rate', { batchSize });
    return res.data.message;
  },
  getUserAccessFrequencies: async () => {
    const res = await api.get<ApiResponse<import('../types').UserAccessFrequencyItem[]>>('/api/admin/user-access-frequencies');
    return res.data.data;
  },
  createEvent: async (request: CreateAdminEventRequest) => {
    const res = await api.post<ApiResponse<AdminInventoryItem>>('/api/admin/events', request);
    return res.data.data;
  },
};

export const blockchainApi = {
  getChain: async () => {
    const res = await api.get<ApiResponse<BlockchainBlock[]>>('/api/blockchain/chain');
    return res.data.data;
  },
  getBlockByOrderId: async (orderId: string) => {
    const res = await api.get<ApiResponse<BlockchainBlock>>(`/api/blockchain/block/${orderId}`);
    return res.data.data;
  },
  verifyChain: async () => {
    const res = await api.get<ApiResponse<BlockchainVerifyResponse>>('/api/blockchain/verify');
    return res.data.data;
  },
  getStats: async () => {
    const res = await api.get<ApiResponse<BlockchainStats>>('/api/blockchain/stats');
    return res.data.data;
  },
};

export const seatingApi = {
  getLayout: async (eventId: string) => {
    const res = await api.get<ApiResponse<SeatingLayoutResponse>>(`/api/seating/layout/${eventId}`);
    return res.data.data;
  },
  saveLayout: async (eventId: string, sections: SectionDto[]) => {
    const res = await api.post<ApiResponse<SeatingLayoutResponse>>(`/api/seating/admin/layout/${eventId}`, {
      eventId,
      sections,
    });
    return res.data.data;
  },
  toggleBlockSeat: async (eventId: string, seatCode: string, blocked: boolean) => {
    const res = await api.post<ApiResponse<boolean>>('/api/seating/admin/block', {
      eventId,
      seatCode,
      blocked,
    });
    return res.data.data;
  },
  updatePrice: async (eventId: string, sectionCode: string, basePrice: number) => {
    const res = await api.post<ApiResponse<boolean>>('/api/seating/admin/price', {
      eventId,
      sectionCode,
      basePrice,
    });
    return res.data.data;
  },
};

export const ticketsApi = {
  verify: async (ticketOrOrderId: string) => {
    const res = await api.get<ApiResponse<TicketVerifyResponse>>(`/api/tickets/verify/${encodeURIComponent(ticketOrOrderId)}`);
    return res.data.data;
  },
  admit: async (ticketOrOrderId: string) => {
    const res = await api.post<ApiResponse<TicketVerifyResponse>>(`/api/tickets/admit/${encodeURIComponent(ticketOrOrderId)}`);
    return res.data.data;
  },
};


