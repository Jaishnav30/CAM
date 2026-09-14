-- ==============================================================================
-- V8: Synchronous Audit Logs Schema
-- Tables: audit_logs
-- ==============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    client_ip VARCHAR(50),
    old_values JSONB,
    new_values JSONB,
    change_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_audit_entity_type CHECK (entity_type IN ('TRANSACTION', 'REIMBURSEMENT', 'USER', 'DOCUMENT', 'CATEGORY', 'ROLE', 'PAYMENT_MODE')),
    CONSTRAINT chk_audit_action CHECK (action IN ('CREATE', 'UPDATE', 'ARCHIVE', 'STATUS_CHANGE'))
);
