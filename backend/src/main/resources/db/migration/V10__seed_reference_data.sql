-- ==============================================================================
-- V10: Reference Data Seeding
-- Seeds: Roles, Permissions, Role-Permission Mappings, Categories, Payment Modes
-- NOTE: ZERO user accounts or credentials are seeded here.
-- ==============================================================================

-- 1. Seed Roles
INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Full system administrator with unrestricted operational and management capabilities'),
    ('ACCOUNTANT', 'Accounts department manager with ledger, reconciliation, and reimbursement approval capabilities'),
    ('MEMBER', 'Standard club member authorized to record personal expenses and submit reimbursement claims'),
    ('AUDITOR', 'Financial auditor with comprehensive read-only inspection access across transactions and audit logs');

-- 2. Seed Granular Permissions
INSERT INTO permissions (code, module, description) VALUES
    -- User Management
    ('users:read', 'USER', 'View system users and role assignments'),
    ('users:create', 'USER', 'Invite or register new user accounts'),
    ('users:update', 'USER', 'Modify user details and assign roles'),
    ('users:disable', 'USER', 'Deactivate or reactivate user accounts'),

    -- Category Master
    ('categories:read', 'CATEGORY', 'View active expense and income categories'),
    ('categories:manage', 'CATEGORY', 'Create, update, or deactivate transaction categories'),

    -- Payment Mode Master
    ('payment_modes:read', 'PAYMENT_MODE', 'View active payment methods'),
    ('payment_modes:manage', 'PAYMENT_MODE', 'Add, configure, or deactivate payment modes'),

    -- Transaction Ledger
    ('transactions:read', 'TRANSACTION', 'View all transactions across the club ledger'),
    ('transactions:create_own', 'TRANSACTION', 'Record personal expense transactions and raise reimbursement claims'),
    ('transactions:create', 'TRANSACTION', 'Record arbitrary income or expense transactions on behalf of the club'),
    ('transactions:update', 'TRANSACTION', 'Edit transaction details where permitted'),
    ('transactions:archive', 'TRANSACTION', 'Soft-archive transactions with justification reason'),

    -- Document Management
    ('documents:read', 'DOCUMENT', 'View and download supporting bills and screenshots'),
    ('documents:upload', 'DOCUMENT', 'Upload bills, screenshots, and supporting receipts'),
    ('documents:delete', 'DOCUMENT', 'Soft-delete supporting document attachments'),

    -- Reimbursements
    ('reimbursements:read', 'REIMBURSEMENT', 'View reimbursement claim queues and status history'),
    ('reimbursements:submit', 'REIMBURSEMENT', 'Submit new or resubmit rejected reimbursement claims'),
    ('reimbursements:review', 'REIMBURSEMENT', 'Inspect submitted receipts and claimant details'),
    ('reimbursements:approve', 'REIMBURSEMENT', 'Approve submitted reimbursement claims'),
    ('reimbursements:reject', 'REIMBURSEMENT', 'Reject reimbursement claims with mandatory rationale'),
    ('reimbursements:mark_paid', 'REIMBURSEMENT', 'Mark approved claims as reimbursed upon payout'),

    -- Reports & Analytics
    ('reports:read', 'REPORT', 'View financial summary reports'),
    ('reports:generate', 'REPORT', 'Export financial records to Excel (.xlsx) and PDF'),
    ('analytics:read', 'ANALYTICS', 'Access financial KPI metrics and category analytics'),

    -- Audit Logs
    ('audit_logs:read', 'AUDIT', 'Inspect system audit trail and entity change history');

-- 3. Map Permissions to Roles

-- ADMIN: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN';

-- ACCOUNTANT
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ACCOUNTANT'
  AND p.code IN (
    'users:read',
    'categories:read',
    'payment_modes:read',
    'transactions:read',
    'transactions:create_own',
    'transactions:create',
    'transactions:update',
    'documents:read',
    'documents:upload',
    'documents:delete',
    'reimbursements:read',
    'reimbursements:submit',
    'reimbursements:review',
    'reimbursements:approve',
    'reimbursements:reject',
    'reimbursements:mark_paid',
    'reports:read',
    'reports:generate',
    'analytics:read'
  );

-- MEMBER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'MEMBER'
  AND p.code IN (
    'categories:read',
    'payment_modes:read',
    'transactions:create_own',
    'documents:upload',
    'reimbursements:submit'
  );

-- AUDITOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'AUDITOR'
  AND p.code IN (
    'users:read',
    'categories:read',
    'payment_modes:read',
    'transactions:read',
    'documents:read',
    'reimbursements:read',
    'reimbursements:review',
    'reports:read',
    'reports:generate',
    'analytics:read',
    'audit_logs:read'
  );

-- 4. Seed Standard Categories
INSERT INTO categories (name, type, description) VALUES
    ('Tournament Equipment', 'EXPENSE', 'Sports gear, kits, balls, tournament gear, and field equipment'),
    ('Refreshments & Catering', 'EXPENSE', 'Food, water, snacks, team meals, and event catering'),
    ('Venue & Field Rental', 'EXPENSE', 'Ground booking, court fees, venue rental, and floodlights'),
    ('Travel & Logistics', 'EXPENSE', 'Bus hire, auto, fuel reimbursement, and transport logistics'),
    ('Printing & Stationery', 'EXPENSE', 'Certificates, flyers, banners, tokens, xerox, and stationery'),
    ('Marketing & Promotion', 'EXPENSE', 'Social media ads, club merchandise, branding, and posters'),
    ('Maintenance & Utilities', 'EXPENSE', 'Gear repairs, first-aid replenishments, cleaning, and storage maintenance'),
    ('Miscellaneous Expense', 'EXPENSE', 'General ad-hoc operational expenses'),
    ('Membership & Contributions', 'INCOME', 'Member subscriptions, registration fees, and regular contributions'),
    ('Sponsorship & Donations', 'INCOME', 'External sponsorships, patron donations, and club grants'),
    ('Event Registrations', 'INCOME', 'Tournament entry fees and external participant tickets'),
    ('Miscellaneous Income', 'INCOME', 'Bank interest, refunds, and miscellaneous receipts');

-- 5. Seed Default Payment Modes (V1: CASH and UPI only)
INSERT INTO payment_modes (code, name, description, is_active) VALUES
    ('CASH', 'Cash Payment', 'Physical cash transactions and petty cash disbursements', TRUE),
    ('UPI', 'UPI / QR Payment', 'Unified Payments Interface (Google Pay, PhonePe, Paytm, BHIM)', TRUE);
