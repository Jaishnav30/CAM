-- ==============================================================================
-- V9: Performance Indexes (Composite & Partial)
-- ==============================================================================

-- 1. Transactions Ledger Query & Filter Optimization
CREATE INDEX idx_transactions_date_status ON transactions (transaction_date DESC, status);
CREATE INDEX idx_transactions_category ON transactions (category_id);
CREATE INDEX idx_transactions_type_mode ON transactions (transaction_type, payment_mode);
CREATE INDEX idx_transactions_created_by ON transactions (created_by, created_at DESC);
CREATE INDEX idx_transactions_search ON transactions (transaction_number);

-- 2. Payment Modes Lookup Optimization
CREATE INDEX idx_payment_modes_active ON payment_modes (is_active);

-- 3. Reimbursements Queue Optimization
CREATE INDEX idx_reimbursements_status_created ON reimbursements (status, created_at DESC);
CREATE INDEX idx_reimbursements_claimant_status ON reimbursements (claimant_id, status);

-- 4. Document Attachments Optimization (Partial Index on active, non-deleted files)
CREATE INDEX idx_documents_transaction_active ON documents (transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_sha256 ON documents (file_hash_sha256);

-- 5. Audit Logs Lookup Optimization
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs (performed_by, created_at DESC);
