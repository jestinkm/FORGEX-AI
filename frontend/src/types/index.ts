export interface EventItem {
  id: string;
  name: string;
  description: string;
  venue: string;
  startTime: string;
  totalTickets: number;
  pricePerSeat?: number;
  rateLimitPerMinute?: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: string;
  email: string;
  name?: string;
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
  seatNumbers?: string;
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
  seatNumbers?: string;
  blockHash?: string;
  blockIndex?: number;
  tokenId?: string;
  contractAddress?: string;
  buyerWallet?: string;
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
  costPerSeat?: number;
  seatNumbers?: string;
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
  costPerSeat?: number;
  pricePerSeat?: number;
  rateLimitPerMinute?: number;
  version: number;
  updatedAt: string;
}

export interface AdminActivityLogItem {
  id: string;
  userId?: string;
  userName?: string;
  userEmail: string;
  action: string;
  details: string;
  status: string;
  ipAddress?: string;
  createdAt: string;
}

export interface UserAccessFrequencyItem {
  userId?: string;
  userName: string;
  userEmail: string;
  role: string;
  totalAccessCount: number;
  loginCount: number;
  captchaCount: number;
  holdCount: number;
  paymentCount: number;
  confirmedCount: number;
  lastAccessTime: string;
  latestAction: string;
  lastIpAddress: string;
  accessFrequencyTier: 'FLASH_SURGE_BUYER' | 'ACTIVE_VISITOR' | 'STANDARD' | string;
}

export interface SeatItem {
  id: string;
  row: string;
  col: number;
  seatCode: string;
  section: 'VIP' | 'CLUB' | 'PITCH';
  tierName: string;
  cost: number;
  status: 'AVAILABLE' | 'HELD' | 'CONFIRMED';
  userName?: string;
  userEmail?: string;
  orderId?: string;
  bookedAt?: string;
  expiresAt?: string;
}

export interface AdminOverview {
  totalEvents: number;
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  soldSeats: number;
  totalRevenue: number;
  costPerSeat?: number;
  totalUsers: number;
  events: AdminInventoryItem[];
  recentBookings: AdminBookingItem[];
  recentActivities?: AdminActivityLogItem[];
  userAccessFrequencies?: UserAccessFrequencyItem[];
}

export interface BlockchainBlock {
  id: number;
  blockIndex: number;
  blockHash: string;
  previousHash: string;
  timestamp: string;
  orderId?: string;
  eventId?: string;
  eventName?: string;
  venue?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerWallet?: string;
  seatNumbers?: string;
  ticketCount?: number;
  totalAmount?: number;
  paymentUtr?: string;
  tokenId?: string;
  contractAddress?: string;
  nonce: number;
  merkleRoot?: string;
  signature?: string;
}

export interface BlockchainVerifyResponse {
  valid: boolean;
  totalBlocks: number;
  verifiedSeats: number;
  genesisHash: string;
  latestBlockHash: string;
  lastVerifiedAt: string;
  consensusStatus: string;
  message: string;
}

export interface BlockchainStats {
  blockHeight: number;
  totalMintedTickets: number;
  totalSeatsOnChain: number;
  contractAddress: string;
  networkName: string;
  consensusAlgorithm: string;
  latestBlockHash: string;
  lastBlockTime: string;
  chainValid: boolean;
}

export interface SeatDto {
  seatCode: string;
  rowLabel: string;
  seatNumber: number;
  seatType: string;
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED' | string;
  positionX?: number;
  positionY?: number;
  isAccessible: boolean;
  isBlocked: boolean;
  isAisle: boolean;
}

export interface RowDto {
  rowLabel: string;
  seatCount: number;
  aislePositions: number[];
  seats: SeatDto[];
}

export interface SectionDto {
  sectionId: string;
  sectionCode: string;
  sectionName: string;
  sectionTier: string;
  basePrice: number;
  colorTheme: string;
  rows: RowDto[];
}

export interface SeatingLayoutResponse {
  eventId: string;
  eventName: string;
  totalSeats: number;
  availableSeats: number;
  heldSeats: number;
  bookedSeats: number;
  blockedSeats: number;
  sections: SectionDto[];
}

export interface SaveLayoutRequest {
  eventId: string;
  sections: SectionDto[];
}

export interface TicketVerifyResponse {
  ticketCode: string;
  orderId?: string;
  eventName: string;
  venue: string;
  eventDate?: string;
  customerName: string;
  customerEmail: string;
  seatCode: string;
  sectionName: string;
  price: number;
  status: 'ACTIVE' | 'USED' | 'INVALID' | string;
  blockchainVerified: boolean;
  blockIndex?: number;
  blockHash?: string;
  buyerWallet?: string;
  admittedAt?: string;
  message: string;
}

export interface CreateAdminEventRequest {
  name: string;
  description?: string;
  venue: string;
  startTime?: string;
  totalTickets: number;
  pricePerSeat: number;
  rateLimitPerMinute?: number;
  seatingPattern?: string;
  sections?: SectionDto[];
}

