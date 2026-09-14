-- ==============================================================================
-- V7: Reimbursement Claims Schema (1:1 with Transactions)
-- Tables: reimbursements
-- Sequences: claim_num_seq
-- ==============================================================================

CREATE SEQUENCE claim_num_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE reimbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(30) NOT NULL UNIQUE,
    transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
    claimant_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_reimbursements_status CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'REIMBURSED')),
    CONSTRAINT chk_reimbursements_rejection_reason CHECK (
        (status = 'REJECTED' AND rejection_reason IS NOT NULL AND length(trim(rejection_reason)) > 0)
        OR (status != 'REJECTED')
    )
);
