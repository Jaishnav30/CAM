import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Layers,
  PieChart,
  BarChart3,
  Info,
} from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi';
import { AnalyticsSummary, AnalyticsBreakdowns, AnalyticsFilterParams } from '../types';

export const AnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [breakdowns, setBreakdowns] = useState<AnalyticsBreakdowns | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'DAY' | 'MONTH'>('MONTH');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filterParams: AnalyticsFilterParams = {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        groupBy,
      };

      const [summaryRes, breakdownRes] = await Promise.all([
        analyticsApi.getSummary(filterParams),
        analyticsApi.getBreakdowns(filterParams),
      ]);

      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }
      if (breakdownRes.success) {
        setBreakdowns(breakdownRes.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch financial analytics.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, groupBy]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Preset Date Handlers
  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const handleSetAllTime = () => {
    setStartDate('');
    setEndDate('');
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
      {/* Header & Filter Bar */}
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
                Financial Analytics & Insights
              </h2>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Executive ledger summaries, reimbursement pipeline metrics, and category distributions.
            </p>
          </div>

          {/* Quick Presets & Refresh */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-outline ${!startDate && !endDate ? 'active' : ''}`}
              style={{
                fontSize: 'var(--font-size-xs)',
                padding: '0.4rem 0.75rem',
                borderColor: !startDate && !endDate ? 'var(--accent-primary)' : undefined,
              }}
              onClick={handleSetAllTime}
            >
              All Time
            </button>
            <button
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.4rem 0.75rem' }}
              onClick={handleSetThisMonth}
            >
              This Month
            </button>
            <button
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.4rem 0.75rem' }}
              onClick={handleSetLastMonth}
            >
              Last Month
            </button>
            <button
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.4rem 0.75rem' }}
              onClick={() => fetchAnalytics()}
              title="Refresh Data"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Date Inputs & Granularity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={15} style={{ color: 'var(--text-secondary)' }} />
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <Layers size={15} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Trend Grouping:
            </span>
            <select
              className="form-input"
              style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'DAY' | 'MONTH')}
            >
              <option value="MONTH">By Month</option>
              <option value="DAY">By Day</option>
            </select>
          </div>
        </div>

        {/* Business Rule Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '0.5rem 0.75rem',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-info)',
          }}
        >
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Accounting Scope:</strong> Financial totals reflect <strong>ONLY COMPLETED</strong> transactions.
            Drafts and archived records are strictly excluded from normal inflow, outflow, and net balance calculations.
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

      {/* Top Level Financial KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Total Inflow */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: '4px solid var(--color-income)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              TOTAL INFLOW (INCOME)
            </span>
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--color-income)',
                borderRadius: 'var(--radius-full)',
                padding: '0.35rem',
              }}
            >
              <TrendingUp size={16} />
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-income)' }}>
            {formatCurrency(summary?.totalInAmount)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Collections, sponsorships, and event receipts
          </div>
        </div>

        {/* Total Outflow */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: '4px solid var(--color-expense)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              TOTAL OUTFLOW (EXPENSES)
            </span>
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--color-expense)',
                borderRadius: 'var(--radius-full)',
                padding: '0.35rem',
              }}
            >
              <TrendingDown size={16} />
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-expense)' }}>
            {formatCurrency(summary?.totalOutAmount)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Operations, purchases, and direct disbursements
          </div>
        </div>

        {/* Net Balance */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: `4px solid ${(summary?.netAmount ?? 0) >= 0 ? 'var(--color-income)' : 'var(--color-expense)'}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              NET BALANCE (CASH FLOW)
            </span>
            <div
              style={{
                backgroundColor: 'var(--accent-primary-subtle)',
                color: 'var(--accent-primary)',
                borderRadius: 'var(--radius-full)',
                padding: '0.35rem',
              }}
            >
              <Scale size={16} />
            </div>
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-2xl)',
              fontWeight: 700,
              color: (summary?.netAmount ?? 0) >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
            }}
          >
            {formatCurrency(summary?.netAmount)}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            {(summary?.netAmount ?? 0) >= 0 ? 'Surplus cash position' : 'Deficit position'}
          </div>
        </div>

        {/* Completed Transactions Count */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderLeft: '4px solid var(--accent-primary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              COMPLETED TRANSACTIONS
            </span>
            <div
              style={{
                backgroundColor: 'var(--accent-primary-subtle)',
                color: 'var(--accent-primary)',
                borderRadius: 'var(--radius-full)',
                padding: '0.35rem',
              }}
            >
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
            {summary?.completedTransactionCount ?? 0}
          </div>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
            Audited & finalized ledger rows
          </div>
        </div>
      </div>

      {/* Reimbursement Claims Status Pipeline */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CreditCard size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
            Reimbursement Pipeline Overview
          </h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Pending / Submitted */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Clock size={16} style={{ color: 'var(--color-pending)' }} />
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                PENDING CLAIMS
              </span>
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-pending)' }}>
              {formatCurrency(summary?.pendingReimbursementAmount)}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {summary?.pendingReimbursementCount ?? 0} claims awaiting approval
            </div>
          </div>

          {/* Approved */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-info)' }} />
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                APPROVED (AWAITING PAYOUT)
              </span>
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-info)' }}>
              {formatCurrency(summary?.approvedReimbursementAmount)}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {summary?.approvedReimbursementCount ?? 0} claims cleared for settlement
            </div>
          </div>

          {/* Settled / Reimbursed */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-income)' }} />
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                SETTLED (REIMBURSED)
              </span>
            </div>
            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-income)' }}>
              {formatCurrency(summary?.reimbursedReimbursementAmount)}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {summary?.reimbursedReimbursementCount ?? 0} claims fully reimbursed
            </div>
          </div>
        </div>
      </div>

      {/* Breakdowns Row: Categories & Payment Modes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Category Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChart size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
              Activity by Category
            </h3>
          </div>

          {!breakdowns?.categoryBreakdown || breakdowns.categoryBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No completed transactions recorded for the selected filter period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {breakdowns.categoryBreakdown.map((cat) => {
                const totalIncome = summary?.totalInAmount || 1;
                const totalExpense = summary?.totalOutAmount || 1;
                const baseTotal = cat.type === 'INCOME' ? totalIncome : totalExpense;
                const percentage = Math.min(100, Math.round(((cat.totalAmount || 0) / (baseTotal || 1)) * 100));

                return (
                  <div
                    key={cat.categoryId}
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                          {cat.categoryName}
                        </span>
                        <span
                          className={`badge ${cat.type === 'INCOME' ? 'badge-success' : 'badge-danger'}`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {cat.type}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                        {formatCurrency(cat.totalAmount)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      <span>{cat.transactionCount} transaction{cat.transactionCount > 1 ? 's' : ''}</span>
                      <span>{percentage}% of {cat.type.toLowerCase()}</span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        marginTop: '0.25rem',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          backgroundColor: cat.type === 'INCOME' ? 'var(--color-income)' : 'var(--color-expense)',
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment Mode Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
              Payment Mode Distribution
            </h3>
          </div>

          {!breakdowns?.paymentModeBreakdown || breakdowns.paymentModeBreakdown.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No completed transactions recorded for the selected filter period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {breakdowns.paymentModeBreakdown.map((mode) => {
                const grandTotal = (summary?.totalInAmount || 0) + (summary?.totalOutAmount || 0) || 1;
                const sharePercent = Math.min(100, Math.round(((mode.totalAmount || 0) / grandTotal) * 100));

                return (
                  <div
                    key={mode.paymentModeId}
                    style={{
                      backgroundColor: 'var(--bg-surface-elevated)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                          {mode.paymentModeName}
                        </span>
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                          {mode.paymentModeCode}
                        </span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                        {formatCurrency(mode.totalAmount)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      <span>{mode.transactionCount} transaction{mode.transactionCount > 1 ? 's' : ''}</span>
                      <span>{sharePercent}% of total volume</span>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: '4px',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                        marginTop: '0.25rem',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${sharePercent}%`,
                          backgroundColor: 'var(--accent-primary)',
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cash Flow Trends Over Time */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
              Cash Flow Trend ({groupBy === 'MONTH' ? 'Monthly' : 'Daily'})
            </h3>
          </div>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
            Chronological aggregation
          </span>
        </div>

        {!breakdowns?.trends || breakdowns.trends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No trend data available for the chosen date interval.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Inflow (Income)</th>
                  <th>Outflow (Expenses)</th>
                  <th>Net Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                {breakdowns.trends.map((t) => (
                  <tr key={t.period}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.period}</td>
                    <td style={{ color: 'var(--color-income)', fontWeight: 600 }}>
                      +{formatCurrency(t.totalIn)}
                    </td>
                    <td style={{ color: 'var(--color-expense)', fontWeight: 600 }}>
                      -{formatCurrency(t.totalOut)}
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: t.net >= 0 ? 'var(--color-income)' : 'var(--color-expense)',
                      }}
                    >
                      {formatCurrency(t.net)}
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
