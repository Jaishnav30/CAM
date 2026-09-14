-- ==============================================================================
-- V6: Documents & Attachments Metadata Schema
-- Tables: documents
-- ==============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    file_hash_sha256 VARCHAR(64) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT chk_documents_type CHECK (document_type IN ('BILL', 'PAYMENT_SCREENSHOT', 'OTHER')),
    CONSTRAINT chk_documents_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760) -- Max 10MB per file
);
