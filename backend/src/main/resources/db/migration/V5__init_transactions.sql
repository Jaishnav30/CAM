-- ==============================================================================
-- V5: Financial Transactions Schema
-- Tables: transactions
-- Sequences: transaction_num_seq
-- ==============================================================================

CREATE SEQUENCE transaction_num_seq START WITH 1001 INCREMENT BY 1;

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(30) NOT NULL UNIQUE,
    transaction_date DATE NOT NULL,
    payer_from VARCHAR(150) NOT NULL,
    recipient_to VARCHAR(150) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL REFERENCES payment_modes(code) ON DELETE RESTRICT,
    reference_number VARCHAR(100),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    comments TEXT,
    invoice_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_transactions_amount CHECK (amount > 0.00),
    CONSTRAINT chk_transactions_type CHECK (transaction_type IN ('IN', 'OUT')),
    CONSTRAINT chk_transactions_invoice_status CHECK (invoice_status IN ('AVAILABLE', 'NOT_AVAILABLE', 'PENDING', 'EXEMPT')),
    CONSTRAINT chk_transactions_status CHECK (status IN ('DRAFT', 'COMPLETED', 'ARCHIVED'))
);
