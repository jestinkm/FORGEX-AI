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
} from '../types';

export const authApi = {
  register: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<AuthResponse>>('/api/auth/register', { email, password });
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
  hold: async (eventId: string, ticketCount: number) => {
    const res = await api.post<ApiResponse<HoldTicketResponse>>('/api/orders/hold', {
      eventId,
      ticketCount,
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
};
