export interface EventItem {
  id: string;
  name: string;
  description: string;
  venue: string;
  startTime: string;
  totalTickets: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: string;
  email: string;
  role: string;
}

export interface QueueJoinResponse {
  eventId: string;
  userId: string;
  queuePosition: number;
  queueDepth: number;
  estimatedWaitSeconds: number;
  status: 'QUEUED' | 'ALREADY_ADMITTED';
  admissionToken?: string;
}

export interface QueueStatusResponse {
  eventId: string;
  userId: string;
  queuePosition: number | null;
  queueDepth: number;
  estimatedWaitSeconds: number | null;
  status: 'WAITING' | 'ADMITTED' | 'NOT_IN_QUEUE';
  admissionToken?: string;
}

export interface HoldTicketResponse {
  orderId: string;
  eventId: string;
  userId: string;
  ticketCount: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  holdExpiresAt: string;
  expiresInSeconds: number;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  idempotencyKey: string;
  providerReference: string;
  createdAt: string;
  duplicateRequest: boolean;
}

export interface OrderResponse {
  orderId: string;
  userId: string;
  eventId: string;
  eventName: string;
  ticketCount: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ErrorResponse {
  status: number;
  error: string;
  message: string;
  path: string;
  correlationId: string;
  timestamp: string;
  details?: string[];
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline' | 'polling';

export interface AdminBookingItem {
  orderId: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  eventId: string;
  eventName: string;
  venue: string;
  ticketCount: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  createdAt: string;
}

export interface AdminInventoryItem {
  eventId: string;
  eventName: string;
  totalTickets: number;
  availableCount: number;
  heldCount: number;
  soldCount: number;
  version: number;
  updatedAt: string;
}

export interface AdminActivityLogItem {
  id: string;
  userId?: string;
  userEmail: string;
  action: string;
  details: string;
  status: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AdminOverview {
  totalEvents: number;
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  soldSeats: number;
  totalRevenue: number;
  totalUsers: number;
  events: AdminInventoryItem[];
  recentBookings: AdminBookingItem[];
  recentActivities?: AdminActivityLogItem[];
}
