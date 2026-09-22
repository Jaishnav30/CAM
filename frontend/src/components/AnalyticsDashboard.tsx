import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import {
  AnalyticsSummary,
  AnalyticsBreakdowns,
  AnalyticsFilterParams,
  CategoryBreakdown,
  PaymentModeBreakdown,
  TransactionTrend,
} from '../types';

// Curated modern color palettes for charts
const CATEGORY_COLORS = [
  '#3b82f6', // Royal Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#64748b', // Slate
];

const PAYMENT_MODE_COLORS: Record<string, string> = {
  UPI: '#06b6d4', // Electric Cyan
  CASH: '#10b981', // Emerald
  BANK_TRANSFER: '#8b5cf6', // Indigo / Violet
  CREDIT_CARD: '#f59e0b', // Amber
  DEBIT_CARD: '#3b82f6', // Royal Blue
  CHEQUE: '#ec4899', // Rose Pink
  NET_BANKING: '#6366f1', // Indigo
};

export const AnalyticsDashboard: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [breakdowns, setBreakdowns] = useState<AnalyticsBreakdowns | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'DAY' | 'MONTH'>('DAY');
  const [categoryTab, setCategoryTab] = useState<'EXPENSES' | 'INCOME' | 'ALL'>('EXPENSES');

  // Hover states for interactive charts
  const [hoveredCatIndex, setHoveredCatIndex] = useState<number | null>(null);
  const [hoveredModeIndex, setHoveredModeIndex] = useState<number | null>(null);
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

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

  // Normalization for Category data
  const categories: CategoryBreakdown[] = useMemo(() => {
    if (!breakdowns) return [];
    if (categoryTab === 'EXPENSES') {
      return breakdowns.expensesByCategory?.length
        ? breakdowns.expensesByCategory
        : (breakdowns.categoryBreakdown?.filter((c) => c.type === 'OUT') || []);
    }
    if (categoryTab === 'INCOME') {
      return breakdowns.incomeByCategory?.length
        ? breakdowns.incomeByCategory
        : (breakdowns.categoryBreakdown?.filter((c) => c.type === 'IN') || []);
    }
    // ALL
    if (breakdowns.categoryBreakdown && breakdowns.categoryBreakdown.length > 0) {
      return breakdowns.categoryBreakdown;
    }
    return [
      ...(breakdowns.expensesByCategory || []),
      ...(breakdowns.incomeByCategory || []),
    ];
  }, [breakdowns, categoryTab]);

  const totalCategoryAmount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.amount ?? c.totalAmount ?? 0), 0);
  }, [categories]);

  // Normalization for Payment Mode data
  const paymentModes: PaymentModeBreakdown[] = useMemo(() => {
    if (!breakdowns) return [];
    return breakdowns.paymentModeBreakdown?.length
      ? breakdowns.paymentModeBreakdown
      : breakdowns.expensesByPaymentMode || [];
  }, [breakdowns]);

  const totalPaymentModeAmount = useMemo(() => {
    return paymentModes.reduce((sum, m) => sum + (m.amount ?? m.totalAmount ?? 0), 0);
  }, [paymentModes]);

  // Normalization for Daily Trends data
  const dailyTrends: TransactionTrend[] = useMemo(() => {
    if (!breakdowns) return [];
    const source = breakdowns.transactionsOverTime?.length
      ? breakdowns.transactionsOverTime
      : breakdowns.trends || [];

    return [...source].sort((a, b) => {
      const dateA = a.date || a.period || '';
      const dateB = b.date || b.period || '';
      return dateA.localeCompare(dateB);
    });
  }, [breakdowns]);

  // Daily Chart Calculations
  const dailyChartMetrics = useMemo(() => {
    if (dailyTrends.length === 0) return { maxAmount: 100, days: [] };

    let maxVal = 0;
    const days = dailyTrends.map((t) => {
      const inVal = t.inAmount ?? t.totalIn ?? 0;
      const outVal = t.outAmount ?? t.totalOut ?? 0;
      const netVal = t.net ?? inVal - outVal;
      const count = (t.inCount ?? 0) + (t.outCount ?? 0);
      const dateStr = t.date || t.period || '';
      if (inVal > maxVal) maxVal = inVal;
      if (outVal > maxVal) maxVal = outVal;
      return {
        dateStr,
        inVal,
        outVal,
        netVal,
        count,
        inCount: t.inCount ?? 0,
        outCount: t.outCount ?? 0,
      };
    });

    const maxAmount = Math.max(maxVal * 1.15, 100);
    return { maxAmount, days };
  }, [dailyTrends]);

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
              Executive ledger summaries, day-wise cash flow curves, and interactive category distributions.
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
              Trend Granularity:
            </span>
            <select
              className="form-input"
              style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'DAY' | 'MONTH')}
            >
              <option value="DAY">Daily (Day-wise)</option>
              <option value="MONTH">Monthly</option>
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
              {summary?.pendingReimbursementCount ?? summary?.reimbursementSubmittedCount ?? 0} claims awaiting approval
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
              {summary?.approvedReimbursementCount ?? summary?.reimbursementApprovedCount ?? 0} claims cleared for settlement
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
              {formatCurrency(summary?.reimbursedReimbursementAmount ?? summary?.totalReimbursedAmount)}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {summary?.reimbursedReimbursementCount ?? summary?.reimbursementReimbursedCount ?? 0} claims fully reimbursed
            </div>
          </div>
        </div>
      </div>

      {/* Breakdowns Row: Categories & Payment Modes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* ==================== 1. Activity by Category Graph ==================== */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                Activity by Category
              </h3>
            </div>

            {/* Category Type Toggle */}
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-surface-elevated)', padding: '0.2rem', borderRadius: '6px' }}>
              <button
                className={`btn btn-sm ${categoryTab === 'EXPENSES' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderRadius: '4px' }}
                onClick={() => setCategoryTab('EXPENSES')}
              >
                Expenses
              </button>
              <button
                className={`btn btn-sm ${categoryTab === 'INCOME' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderRadius: '4px' }}
                onClick={() => setCategoryTab('INCOME')}
              >
                Income
              </button>
              <button
                className={`btn btn-sm ${categoryTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderRadius: '4px' }}
                onClick={() => setCategoryTab('ALL')}
              >
                All
              </button>
            </div>
          </div>

          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No completed transactions recorded for the selected filter period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Interactive SVG Donut Chart */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  padding: '0.5rem 0',
                }}
              >
                <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                  {(() => {
                    const radius = 76;
                    const circumference = 2 * Math.PI * radius;
                    let accumulatedPercent = 0;

                    return categories.map((cat, idx) => {
                      const amount = cat.amount ?? cat.totalAmount ?? 0;
                      const percent = totalCategoryAmount > 0 ? (amount / totalCategoryAmount) * 100 : 0;
                      const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += percent;

                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      const isHovered = hoveredCatIndex === idx;

                      return (
                        <circle
                          key={cat.categoryId || idx}
                          cx="110"
                          cy="110"
                          r={radius}
                          fill="transparent"
                          stroke={color}
                          strokeWidth={isHovered ? 26 : 20}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          style={{
                            cursor: 'pointer',
                            transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                            filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
                          }}
                          onMouseEnter={() => setHoveredCatIndex(idx)}
                          onMouseLeave={() => setHoveredCatIndex(null)}
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Donut Chart Center Readout */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    maxWidth: '120px',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {hoveredCatIndex !== null && categories[hoveredCatIndex]
                      ? categories[hoveredCatIndex].categoryName
                      : `${categoryTab} TOTAL`}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {hoveredCatIndex !== null && categories[hoveredCatIndex]
                      ? formatCurrency(categories[hoveredCatIndex].amount ?? categories[hoveredCatIndex].totalAmount)
                      : formatCurrency(totalCategoryAmount)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.1rem' }}>
                    {hoveredCatIndex !== null && categories[hoveredCatIndex]
                      ? `${(
                        totalCategoryAmount > 0
                          ? (((categories[hoveredCatIndex].amount ?? categories[hoveredCatIndex].totalAmount ?? 0) / totalCategoryAmount) * 100).toFixed(1)
                          : 0
                      )}% share`
                      : `${categories.length} categories`}
                  </div>
                </div>
              </div>

              {/* Category Breakdown Progress Bars & Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {categories.map((cat, idx) => {
                  const amount = cat.amount ?? cat.totalAmount ?? 0;
                  const count = cat.count ?? cat.transactionCount ?? 0;
                  const percent = totalCategoryAmount > 0 ? ((amount / totalCategoryAmount) * 100) : 0;
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  const isHovered = hoveredCatIndex === idx;

                  return (
                    <div
                      key={cat.categoryId || idx}
                      onMouseEnter={() => setHoveredCatIndex(idx)}
                      onMouseLeave={() => setHoveredCatIndex(null)}
                      style={{
                        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-surface-elevated)',
                        border: isHovered ? `1px solid ${color}` : '1px solid transparent',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                            {cat.categoryName}
                          </span>
                          <span
                            className={`badge ${cat.type === 'IN' ? 'badge-success' : 'badge-danger'}`}
                            style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}
                          >
                            {cat.type || (categoryTab === 'INCOME' ? 'IN' : 'OUT')}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                          {formatCurrency(amount)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        <span>{count} transaction{count !== 1 ? 's' : ''}</span>
                        <span>{percent.toFixed(1)}% of total</span>
                      </div>

                      {/* Animated Colored Bar */}
                      <div
                        style={{
                          height: '5px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginTop: '0.2rem',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(2, percent))}%`,
                            backgroundColor: color,
                            borderRadius: '3px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ==================== 2. Payment Mode Distribution Graph ==================== */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                Payment Mode Distribution
              </h3>
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
              {paymentModes.length} Active Mode{paymentModes.length !== 1 ? 's' : ''}
            </span>
          </div>

          {paymentModes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              No completed transactions recorded for the selected filter period.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Interactive SVG Donut Chart for Payment Modes */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'relative',
                  padding: '0.5rem 0',
                }}
              >
                <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                  {(() => {
                    const radius = 76;
                    const circumference = 2 * Math.PI * radius;
                    let accumulatedPercent = 0;

                    return paymentModes.map((mode, idx) => {
                      const amount = mode.amount ?? mode.totalAmount ?? 0;
                      const percent = totalPaymentModeAmount > 0 ? (amount / totalPaymentModeAmount) * 100 : 0;
                      const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                      accumulatedPercent += percent;

                      const modeCode = mode.paymentModeCode?.toUpperCase() || '';
                      const color = PAYMENT_MODE_COLORS[modeCode] || CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      const isHovered = hoveredModeIndex === idx;

                      return (
                        <circle
                          key={mode.paymentModeCode || idx}
                          cx="110"
                          cy="110"
                          r={radius}
                          fill="transparent"
                          stroke={color}
                          strokeWidth={isHovered ? 26 : 20}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          style={{
                            cursor: 'pointer',
                            transition: 'stroke-width 0.2s ease, filter 0.2s ease',
                            filter: isHovered ? `drop-shadow(0 0 8px ${color})` : 'none',
                          }}
                          onMouseEnter={() => setHoveredModeIndex(idx)}
                          onMouseLeave={() => setHoveredModeIndex(null)}
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Donut Chart Center Readout */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    maxWidth: '120px',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {hoveredModeIndex !== null && paymentModes[hoveredModeIndex]
                      ? paymentModes[hoveredModeIndex].paymentModeName
                      : 'ALL MODES'}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                    {hoveredModeIndex !== null && paymentModes[hoveredModeIndex]
                      ? formatCurrency(paymentModes[hoveredModeIndex].amount ?? paymentModes[hoveredModeIndex].totalAmount)
                      : formatCurrency(totalPaymentModeAmount)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#06b6d4', fontWeight: 600, marginTop: '0.1rem' }}>
                    {hoveredModeIndex !== null && paymentModes[hoveredModeIndex]
                      ? `${(
                        totalPaymentModeAmount > 0
                          ? (((paymentModes[hoveredModeIndex].amount ?? paymentModes[hoveredModeIndex].totalAmount ?? 0) / totalPaymentModeAmount) * 100).toFixed(1)
                          : 0
                      )}% volume`
                      : `${paymentModes.length} modes active`}
                  </div>
                </div>
              </div>

              {/* Payment Mode List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {paymentModes.map((mode, idx) => {
                  const amount = mode.amount ?? mode.totalAmount ?? 0;
                  const count = mode.count ?? mode.transactionCount ?? 0;
                  const percent = totalPaymentModeAmount > 0 ? ((amount / totalPaymentModeAmount) * 100) : 0;
                  const modeCode = mode.paymentModeCode?.toUpperCase() || '';
                  const color = PAYMENT_MODE_COLORS[modeCode] || CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  const isHovered = hoveredModeIndex === idx;

                  return (
                    <div
                      key={mode.paymentModeCode || idx}
                      onMouseEnter={() => setHoveredModeIndex(idx)}
                      onMouseLeave={() => setHoveredModeIndex(null)}
                      style={{
                        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.05)' : 'var(--bg-surface-elevated)',
                        border: isHovered ? `1px solid ${color}` : '1px solid transparent',
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                            {mode.paymentModeName}
                          </span>
                          <span className="badge badge-info" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                            {mode.paymentModeCode}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                          {formatCurrency(amount)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        <span>{count} transaction{count !== 1 ? 's' : ''}</span>
                        <span>{percent.toFixed(1)}% of total volume</span>
                      </div>

                      {/* Progress Bar */}
                      <div
                        style={{
                          height: '5px',
                          backgroundColor: 'var(--bg-primary)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          marginTop: '0.2rem',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.max(2, percent))}%`,
                            backgroundColor: color,
                            borderRadius: '3px',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 3. Cash Flow Trend (Daily) Graph ==================== */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                Cash Flow Trend (Daily)
              </h3>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Day-wise chronological inflow, outflow, and net cash flow aggregation
            </p>
          </div>

          {/* Chart Legend Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: 'var(--font-size-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Inflow (+)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Outflow (-)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '12px', height: '3px', borderRadius: '2px', backgroundColor: '#06b6d4' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Net Trend</span>
            </div>
          </div>
        </div>

        {dailyChartMetrics.days.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No trend data available for the chosen date interval.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* SVG Trend Graph */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1rem 0.5rem',
                border: '1px solid var(--border-subtle)',
                overflowX: 'auto',
              }}
            >
              {(() => {
                const chartWidth = Math.max(760, dailyChartMetrics.days.length * 90);
                const chartHeight = 260;
                const padLeft = 65;
                const padRight = 35;
                const padTop = 30;
                const padBottom = 45;
                const plotWidth = chartWidth - padLeft - padRight;
                const plotHeight = chartHeight - padTop - padBottom;
                const maxAmount = dailyChartMetrics.maxAmount;
                const days = dailyChartMetrics.days;
                const stepX = plotWidth / Math.max(days.length, 1);
                const barWidth = Math.min(22, stepX * 0.32);

                // Build net points line
                const netPoints = days.map((d, i) => {
                  const cx = padLeft + (i + 0.5) * stepX;
                  // Map net: 0 is at bottom (or middle if deficit)
                  const clampedAmount = Math.abs(d.netVal);
                  const cy = padTop + plotHeight - (clampedAmount / maxAmount) * plotHeight;
                  return { cx, cy, day: d };
                });

                const linePath = netPoints.reduce((acc, pt, i) => {
                  return i === 0 ? `M ${pt.cx} ${pt.cy}` : `${acc} L ${pt.cx} ${pt.cy}`;
                }, '');

                return (
                  <div style={{ position: 'relative', width: '100%', minWidth: `${chartWidth}px` }}>
                    <svg
                      width="100%"
                      height={chartHeight}
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      style={{ overflow: 'visible' }}
                    >
                      <defs>
                        <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
                        </linearGradient>
                        <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#dc2626" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y = padTop + plotHeight - ratio * plotHeight;
                        const labelValue = ratio * maxAmount;
                        return (
                          <g key={ratio}>
                            <line
                              x1={padLeft}
                              y1={y}
                              x2={chartWidth - padRight}
                              y2={y}
                              stroke="rgba(255, 255, 255, 0.08)"
                              strokeDasharray={ratio === 0 ? 'none' : '4 4'}
                            />
                            <text
                              x={padLeft - 8}
                              y={y + 4}
                              textAnchor="end"
                              fontSize="10"
                              fill="var(--text-muted)"
                            >
                              ₹{Math.round(labelValue)}
                            </text>
                          </g>
                        );
                      })}

                      {/* Daily Bars & Hover Guides */}
                      {days.map((d, idx) => {
                        const cx = padLeft + (idx + 0.5) * stepX;
                        const inH = (d.inVal / maxAmount) * plotHeight;
                        const outH = (d.outVal / maxAmount) * plotHeight;
                        const isHovered = hoveredDayIndex === idx;

                        // Format short date for X-axis
                        let shortDate = d.dateStr;
                        try {
                          const dt = new Date(d.dateStr + 'T00:00:00');
                          shortDate = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                        } catch {
                          // keep raw
                        }

                        return (
                          <g
                            key={d.dateStr}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoveredDayIndex(idx)}
                            onMouseLeave={() => setHoveredDayIndex(null)}
                          >
                            {/* Hover Column Background */}
                            <rect
                              x={cx - stepX * 0.46}
                              y={padTop}
                              width={stepX * 0.92}
                              height={plotHeight}
                              fill={isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
                              rx="6"
                              style={{ transition: 'fill 0.15s ease' }}
                            />

                            {/* Inflow Bar (Green) */}
                            {d.inVal > 0 && (
                              <rect
                                x={cx - barWidth - 2}
                                y={padTop + plotHeight - inH}
                                width={barWidth}
                                height={Math.max(3, inH)}
                                fill="url(#inflowGrad)"
                                rx="3"
                                style={{
                                  filter: isHovered ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))' : 'none',
                                  transition: 'filter 0.15s ease',
                                }}
                              />
                            )}

                            {/* Outflow Bar (Red) */}
                            {d.outVal > 0 && (
                              <rect
                                x={cx + 2}
                                y={padTop + plotHeight - outH}
                                width={barWidth}
                                height={Math.max(3, outH)}
                                fill="url(#outflowGrad)"
                                rx="3"
                                style={{
                                  filter: isHovered ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))' : 'none',
                                  transition: 'filter 0.15s ease',
                                }}
                              />
                            )}

                            {/* X-axis Date Label */}
                            <text
                              x={cx}
                              y={padTop + plotHeight + 18}
                              textAnchor="middle"
                              fontSize="11"
                              fontWeight={isHovered ? 700 : 500}
                              fill={isHovered ? 'var(--text-primary)' : 'var(--text-secondary)'}
                            >
                              {shortDate}
                            </text>
                          </g>
                        );
                      })}

                      {/* Net Flow Curve & Markers */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ filter: 'drop-shadow(0 0 4px rgba(6, 182, 212, 0.5))' }}
                      />

                      {netPoints.map((pt, idx) => {
                        const isHovered = hoveredDayIndex === idx;
                        return (
                          <circle
                            key={idx}
                            cx={pt.cx}
                            cy={pt.cy}
                            r={isHovered ? 6 : 4}
                            fill="#06b6d4"
                            stroke="#1f2937"
                            strokeWidth="2"
                            style={{
                              cursor: 'pointer',
                              transition: 'r 0.15s ease',
                            }}
                            onMouseEnter={() => setHoveredDayIndex(idx)}
                            onMouseLeave={() => setHoveredDayIndex(null)}
                          />
                        );
                      })}
                    </svg>

                    {/* Floating Tooltip for Hovered Day */}
                    {hoveredDayIndex !== null && days[hoveredDayIndex] && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: `${Math.min(chartWidth - 210, Math.max(10, padLeft + (hoveredDayIndex + 0.5) * stepX - 100))}px`,
                          backgroundColor: '#111827',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.8)',
                          pointerEvents: 'none',
                          zIndex: 20,
                          minWidth: '190px',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f3f4f6', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.3rem', marginBottom: '0.4rem' }}>
                          {(() => {
                            try {
                              const dt = new Date(days[hoveredDayIndex].dateStr + 'T00:00:00');
                              return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                            } catch {
                              return days[hoveredDayIndex].dateStr;
                            }
                          })()}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#10b981', marginBottom: '0.2rem' }}>
                          <span>Inflow:</span>
                          <span style={{ fontWeight: 600 }}>+{formatCurrency(days[hoveredDayIndex].inVal)} ({days[hoveredDayIndex].inCount} txns)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#ef4444', marginBottom: '0.2rem' }}>
                          <span>Outflow:</span>
                          <span style={{ fontWeight: 600 }}>-{formatCurrency(days[hoveredDayIndex].outVal)} ({days[hoveredDayIndex].outCount} txns)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: days[hoveredDayIndex].netVal >= 0 ? '#10b981' : '#ef4444', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.3rem', marginTop: '0.3rem' }}>
                          <span>Net Cash:</span>
                          <span>{formatCurrency(days[hoveredDayIndex].netVal)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
