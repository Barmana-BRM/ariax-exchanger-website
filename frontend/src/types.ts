export interface KYCDetails {
  fullName: string;
  nationalId: string;
  phone: string;
  email?: string;
  documentUrl?: string;
  nationalIdImage?: string;
  selfieImage?: string;
  supportingDocument?: string;
  draftToken?: string;
  currentStep?: number;
  step1Status?: 'pending' | 'approved' | 'rejected';
  step2Status?: 'pending' | 'approved' | 'rejected';
  step3Status?: 'pending' | 'approved' | 'rejected';
  overallStatus?: 'draft' | 'pending_review' | 'approved' | 'rejected';
  faceMatchScore?: number;
  homeAddress?: string;
  timestamp?: string;
  rejectionReason?: string;
}

export interface User {
  id: string;
  name: string;
  avatarColor: string;
  role: string;
  balances: {
    IRT: number;  // Tomans
    BTC: number;  // Bitcoin
    ETH: number;  // Ethereum
    USDT: number; // Tether
    TRX: number;  // Tron
  };
  cryptoAddresses: {
    BTC: string;
    USDT: string; // TRC20
    TRX: string;
  };
  cardNo: string;
  shibaNo: string;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected' | 'draft';
  kycDetails?: KYCDetails;
}

export interface KycDraftSnapshot {
  draftToken: string;
  currentStep: number;
  overallStatus: 'draft' | 'pending_review' | 'approved' | 'rejected';
  step1Status: 'pending' | 'approved' | 'rejected';
  step2Status: 'pending' | 'approved' | 'rejected';
  step3Status: 'pending' | 'approved' | 'rejected';
  faceMatchScore?: number;
  kycDetails?: KYCDetails;
}

export interface KycReportRow {
  id: number;
  userId?: string | null;
  draftToken: string;
  fullName: string;
  nationalId: string;
  phone: string;
  email?: string | null;
  currentStep: number;
  step1Status: 'pending' | 'approved' | 'rejected';
  step2Status: 'pending' | 'approved' | 'rejected';
  step3Status: 'pending' | 'approved' | 'rejected';
  overallStatus: 'draft' | 'pending_review' | 'approved' | 'rejected';
  faceMatchScore?: number | null;
  submittedAt?: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: 'deposit' | 'withdraw' | 'trade';
  asset: 'IRT' | 'BTC' | 'ETH' | 'USDT' | 'TRX';
  amount: number;
  fee: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'rejected';
  destination: string; // e.g. "بانک ملی - کارت ۶۰۳۷...", "آدرس ولت: TQ7...", "تبدیل به USDT"
  txId?: string;
}

export interface TeamTask {
  id: string;
  title: string;
  assignedTo: string; // User ID
  status: 'todo' | 'in_progress' | 'done';
  createdAt: string;
  category: 'wallet' | 'support' | 'technical' | 'liquidity';
}

export interface TeamMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  category: 'wallet' | 'support' | 'technical' | 'kyc' | 'other';
  status: 'open' | 'in_progress' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  message: string;
  timestamp: string;
}

export interface MarketHistoryItem {
  time: string;
  price: number;
  volume: number;
}

export interface MarketTicker {
  symbol: 'BTC' | 'ETH' | 'USDT' | 'TRX';
  name: string;
  faName: string;
  priceIRT: number; // Price in Tomans
  priceUSD: number; // Price in USD
  change24h: number; // Percentage change
  volume24h: number;
  high24h: number;
  low24h: number;
  history: MarketHistoryItem[];
}
