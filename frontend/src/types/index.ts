export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  batch?: string;
  committee?: string;
  upiId?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  batch?: string;
  committee?: string;
  upiId?: string;
  approvalStatus?: string;
  roles: string[];
  permissions: string[];
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export const COMMITTEES = [
  'Marketing',
  'Events',
  'Sponsorship & Logistics',
  'Graphics & Photography',
  'Accounts',
  'Content Writing',
] as const;

export type CommitteeType = (typeof COMMITTEES)[number];

export interface SendOtpRequest {
  email: string;
  username?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  fullName?: string;
  password: string;
  confirmPassword?: string;
  avatarUrl?: string;
  batch?: string;
  committee?: string;
  upiId?: string;
  requestedRole: 'MEMBER' | 'ACCOUNTANT';
  otp: string;
}

export interface UserRegistrationItem {
  id: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  batch?: string;
  committee?: string;
  upiId?: string;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  active: boolean;
  deleted?: boolean;
  deletedAt?: string;
  roles: string[];
  createdAt: string;
}

export interface UserProfileStats {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  batch?: string;
  committee?: string;
  upiId?: string;
  approvalStatus: string;
  active: boolean;
  deleted?: boolean;
  deletedAt?: string;
  roles: string[];
  permissions: string[];
  memberSince: string;
  totalTransactionsCount: number;
  totalAmountSpent: number;
  totalReimbursementsCount: number;
  totalReimbursementApplied: number;
  pendingReimbursementAmount: number;
  pendingReimbursementCount: number;
  approvedReimbursementAmount: number;
  approvedReimbursementCount: number;
  paidReimbursementAmount: number;
  paidReimbursementCount: number;
  rejectedReimbursementAmount: number;
  rejectedReimbursementCount: number;
}

export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
  description?: string;
}

export interface UpdateCategoryRequest {
  name: string;
  type: CategoryType;
  description?: string;
  isActive?: boolean;
}

export interface BulkDeleteCategoryResponse {
  deletedCount: number;
  deletedIds: string[];
  deletedNames: string[];
  failedCount: number;
  failedReasons: string[];
}

export interface PaymentMode {
  id: string;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export type TransactionType = 'IN' | 'OUT';
export type InvoiceStatus = 'AVAILABLE' | 'NOT_AVAILABLE' | 'PENDING' | 'EXEMPT';
export type TransactionStatus = 'DRAFT' | 'COMPLETED' | 'ARCHIVED';

export interface Transaction {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  payerFrom: string;
  recipientTo: string;
  amount: number;
  transactionType: TransactionType;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  category: Category;
  comments?: string;
  invoiceStatus: InvoiceStatus;
  status: TransactionStatus;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
  screenshotDocumentId?: string;
  billDocumentId?: string;
}

export interface CreateTransactionRequest {
  transactionDate: string;
  payerFrom: string;
  recipientTo: string;
  amount: number;
  transactionType?: TransactionType;
  paymentMode: string;
  referenceNumber?: string;
  categoryId: string;
  comments?: string;
  invoiceStatus?: InvoiceStatus;
  status?: TransactionStatus;
  createdBy?: string;
  requestReimbursement?: boolean;
}

export interface UpdateTransactionRequest {
  transactionDate: string;
  payerFrom: string;
  recipientTo: string;
  amount: number;
  transactionType?: TransactionType;
  paymentMode: string;
  referenceNumber?: string;
  categoryId: string;
  comments?: string;
  invoiceStatus?: InvoiceStatus;
  status?: TransactionStatus;
}

export interface ArchiveTransactionRequest {
  reason: string;
}

export interface TransactionFilterParams {
  startDate?: string;
  endDate?: string;
  type?: TransactionType | '';
  categoryId?: string;
  paymentMode?: string;
  status?: TransactionStatus | '';
  includeArchived?: boolean;
  createdById?: string;
  page?: number;
  size?: number;
  sort?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export type DocumentType = 'BILL' | 'PAYMENT_SCREENSHOT' | 'OTHER';

export interface DocumentResponse {
  id: string;
  transactionId: string;
  documentType: DocumentType;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
  fileHashSha256: string;
  uploadedBy?: UserSummary;
  createdAt: string;
}

export type ReimbursementStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';

export interface ReimbursementResponse {
  id: string;
  claimNumber: string;
  transactionId: string;
  transactionNumber: string;
  transactionDate?: string;
  amount: number;
  payerFrom?: string;
  recipientTo?: string;
  category?: Category;
  paymentMode?: PaymentMode;
  claimant: UserSummary;
  status: ReimbursementStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitReimbursementRequest {
  transactionId: string;
}

export interface RejectReimbursementRequest {
  reason: string;
}

export interface ReimbursementFilterParams {
  status?: ReimbursementStatus | '';
  claimantId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// ==================== PHASE 6 TYPES ====================

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: UserSummary;
  oldValues?: string;
  newValues?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogFilterParams {
  entityType?: string;
  entityId?: string;
  action?: string;
  performedById?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface AnalyticsSummary {
  totalInAmount: number;
  totalOutAmount: number;
  netAmount: number;
  transactionCount?: number;
  inTransactionCount?: number;
  outTransactionCount?: number;
  completedTransactionCount: number;
  archivedTransactionCount?: number;
  reimbursementSubmittedCount?: number;
  reimbursementApprovedCount?: number;
  reimbursementRejectedCount?: number;
  reimbursementReimbursedCount?: number;
  totalReimbursedAmount?: number;
  // Aliases for backwards compatibility:
  pendingReimbursementCount?: number;
  pendingReimbursementAmount?: number;
  approvedReimbursementCount?: number;
  approvedReimbursementAmount?: number;
  reimbursedReimbursementCount?: number;
  reimbursedReimbursementAmount?: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  count: number;
  percentage: number;
  type?: string;
  totalAmount?: number;
  transactionCount?: number;
}

export interface PaymentModeBreakdown {
  paymentModeCode: string;
  paymentModeName: string;
  amount: number;
  count: number;
  percentage: number;
  paymentModeId?: string;
  totalAmount?: number;
  transactionCount?: number;
}

export interface TransactionTrend {
  date: string;
  inAmount: number;
  outAmount: number;
  inCount: number;
  outCount: number;
  period?: string;
  totalIn?: number;
  totalOut?: number;
  net?: number;
}

export interface AnalyticsBreakdowns {
  expensesByCategory: CategoryBreakdown[];
  incomeByCategory: CategoryBreakdown[];
  expensesByPaymentMode: PaymentModeBreakdown[];
  transactionsOverTime: TransactionTrend[];
  // Direct aliases from backend getters:
  categoryBreakdown?: CategoryBreakdown[];
  paymentModeBreakdown?: PaymentModeBreakdown[];
  trends?: TransactionTrend[];
}

export interface AnalyticsFilterParams {
  startDate?: string;
  endDate?: string;
  groupBy?: 'DAY' | 'MONTH';
}

export interface TransactionReportRow {
  id: string;
  transactionNumber: string;
  transactionDate: string;
  payerFrom: string;
  recipientTo: string;
  amount: number;
  transactionType: TransactionType;
  categoryName: string;
  paymentModeName: string;
  referenceNumber?: string;
  invoiceStatus: InvoiceStatus;
  status: TransactionStatus;
  createdByName: string;
  createdAt: string;
}

export interface ReimbursementReportRow {
  id: string;
  claimNumber: string;
  transactionNumber: string;
  transactionDate: string;
  claimantName: string;
  claimantEmail: string;
  amount: number;
  status: ReimbursementStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== RBAC MATRIX TYPES ====================

export interface PermissionItem {
  code: string;
  module: string;
  description: string;
}

export interface RbacMatrixResponse {
  permissions: PermissionItem[];
  roles: string[];
  modules: string[];
  rolePermissions: Record<string, string[]>;
}

export interface UpdateRbacMatrixRequest {
  rolePermissions: Record<string, string[]>;
}


