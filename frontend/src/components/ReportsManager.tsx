import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { reportApi, ReportFilterParams } from '../api/reportApi';
import { categoryApi } from '../api/categoryApi';
import { Category, TransactionReportRow, ReimbursementReportRow } from '../types';

export const ReportsManager: React.FC = () => {
  const [reportType, setReportType] = useState<'TRANSACTIONS' | 'REIMBURSEMENTS'>('TRANSACTIONS');
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('');

  // Data States
  const [transactionRows, setTransactionRows] = useState<TransactionReportRow[]>([]);
  const [reimbursementRows, setReimbursementRows] = useState<ReimbursementReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    categoryApi
      .getActiveCategories()
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
  }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ReportFilterParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        paymentMode: paymentMode || undefined,
      };

      if (reportType === 'TRANSACTIONS') {
        const res = await reportApi.getTransactionReport(params);
        if (res.success) {
          setTransactionRows(res.data);
        }
      } else {
        const res = await reportApi.getReimbursementReport(params);
        if (res.success) {
          setReimbursementRows(res.data);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate report data.');
    } finally {
      setLoading(false);
    }
  }, [reportType, startDate, endDate, status, categoryId, paymentMode]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    setError(null);
    try {
      const params: ReportFilterParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        paymentMode: paymentMode || undefined,
      };

      if (reportType === 'TRANSACTIONS') {
        await reportApi.downloadTransactionsCsv(params);
      } else {
        await reportApi.downloadReimbursementsCsv(params);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV file.');
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Report Selection */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>
                Financial Reports & Export Hub
              </h2>
              <span className="badge badge-info" style={{ textTransform: 'none' }}>
                RFC-4180
              </span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Preview and export filtered transaction statements and reimbursement audits.
            </p>
          </div>

          {/* Report Type Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-surface-elevated)',
              padding: '0.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
            }}
          >
            <button
              className={`btn ${reportType === 'TRANSACTIONS' ? 'btn-primary' : ''}`}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
              }}
              onClick={() => {
                setReportType('TRANSACTIONS');
                setStatus('');
              }}
            >
              <Receipt size={14} />
              Transactions Statement
            </button>
            <button
              className={`btn ${reportType === 'REIMBURSEMENTS' ? 'btn-primary' : ''}`}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
              }}
              onClick={() => {
                setReportType('REIMBURSEMENTS');
                setStatus('');
              }}
            >
              <CreditCard size={14} />
              Reimbursements Audit
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              From:
            </span>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              To:
            </span>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Status:
            </span>
            <select
              className="form-input"
              style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {reportType === 'TRANSACTIONS' ? (
                <>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </>
              ) : (
                <>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="REIMBURSED">REIMBURSED</option>
                </>
              )}
            </select>
          </div>

          {/* Category filter (Transactions only) */}
          {reportType === 'TRANSACTIONS' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Category:
              </span>
              <select
                className="form-input"
                style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Mode filter (Transactions only) */}
          {reportType === 'TRANSACTIONS' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Payment Mode:
              </span>
              <select
                className="form-input"
                style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="">All Modes</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.4rem 0.75rem' }}
              onClick={() => fetchReportData()}
              disabled={loading}
              title="Apply Filters and Refresh Preview"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>

            <button
              className="btn btn-primary"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.4rem 0.85rem' }}
              onClick={handleDownloadCsv}
              disabled={downloading}
            >
              <Download size={14} className={downloading ? 'spin' : ''} />
              {downloading ? 'Exporting...' : 'Download CSV'}
            </button>
          </div>
        </div>

        {/* Security Notification */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 0.75rem',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-income)',
          }}
        >
          <ShieldCheck size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Secure RFC-4180 Export:</strong> CSV formulas starting with =, +, -, @, or control characters are
            automatically sanitized with single-quote escaping to guard against spreadsheet injection attacks.
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: 'var(--color-expense)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Report Data Preview Table */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
              Report Preview
            </h3>
          </div>
          <span className="badge badge-info" style={{ textTransform: 'none' }}>
            {reportType === 'TRANSACTIONS'
              ? `${transactionRows.length} transactions match filters`
              : `${reimbursementRows.length} claims match filters`}
          </span>
        </div>

        {reportType === 'TRANSACTIONS' ? (
          transactionRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No transactions match the selected criteria.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Txn #</th>
                    <th>Type</th>
                    <th>Payer / Recipient</th>
                    <th>Category</th>
                    <th>Payment Mode</th>
                    <th>Amount (₹)</th>
                    <th>Status</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{row.transactionDate}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.transactionNumber}</td>
                      <td>
                        <span
                          className={`badge ${row.transactionType === 'IN' ? 'badge-success' : 'badge-danger'}`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {row.transactionType}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {row.transactionType === 'IN' ? row.payerFrom : row.recipientTo}
                        </div>
                      </td>
                      <td>{row.categoryName}</td>
                      <td>{row.paymentModeName}</td>
                      <td
                        style={{
                          fontWeight: 700,
                          color: row.transactionType === 'IN' ? 'var(--color-income)' : 'var(--color-expense)',
                        }}
                      >
                        {row.transactionType === 'IN' ? '+' : '-'}
                        {formatCurrency(row.amount)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            row.status === 'COMPLETED'
                              ? 'badge-success'
                              : row.status === 'DRAFT'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        {row.createdByName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : reimbursementRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No reimbursement claims match the selected criteria.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim #</th>
                  <th>Linked Txn #</th>
                  <th>Claimant</th>
                  <th>Amount (₹)</th>
                  <th>Status</th>
                  <th>Rejection Reason</th>
                  <th>Date Submitted</th>
                </tr>
              </thead>
              <tbody>
                {reimbursementRows.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.claimNumber}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.transactionNumber}</td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 500 }}>{row.claimantName}</span>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          {row.claimantEmail}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(row.amount)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          row.status === 'REIMBURSED'
                            ? 'badge-success'
                            : row.status === 'APPROVED'
                            ? 'badge-info'
                            : row.status === 'REJECTED'
                            ? 'badge-danger'
                            : 'badge-warning'
                        }`}
                        style={{ fontSize: '0.65rem' }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: row.rejectionReason ? 'var(--color-expense)' : 'var(--text-muted)' }}>
                      {row.rejectionReason || '—'}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {new Date(row.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
