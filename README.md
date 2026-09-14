# CAM - Club Accounting & Management

A financial operations, transaction ledger, and reimbursement management system designed for student clubs and campus organizations.

---

## 🚀 Key Features

* **Financial Ledger & Transactions**: Record IN/OUT transactions, payment modes, categories, supporting bill/receipt uploads, and reconciliation states.
* **Member & Accountant Registration**: Self-registration with 6-digit email OTP verification via Gmail SMTP.
* **Administrative Approvals**: Dedicated admin interface to review, approve, or reject new registrations.
* **Role-Based Access Control (RBAC)**: Fine-grained permissions matrix across Administrator, Accountant, and Member roles.
* **Reimbursement Management**: End-to-end reimbursement claim tracking and multi-tier approval workflows.
* **Audit Trail**: Append-only tamper-evident audit logging for all critical financial and administrative operations.
* **Analytics & Reports**: Visual expense/income breakdowns, category analytics, and CSV report export.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Vite, Vanilla CSS design tokens.
* **Backend**: Java 21, Spring Boot 3.3.4, Spring Security, Spring Data JPA, Jakarta Mail.
* **Database**: PostgreSQL 16 with Flyway database migrations.
* **Storage**: Two-tier document storage (staging quarantine + partitioned permanent storage with SHA-256 integrity verification).

---

## 💻 Local Development Setup

### 1. Database
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
mvn clean spring-boot:run
```
Backend runs on `http://localhost:8081`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.
