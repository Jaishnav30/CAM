import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CreditCard,
  Receipt,
  Bell,
  BarChart3,
  Gift,
  LogOut,
  Search,
  Plus,
  ChevronDown,
  Settings,
  HelpCircle,
  Check,
  Play,
  FileText,
  Flame,
  Music,
  User as UserIcon,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import { analyticsApi } from '../api/analyticsApi';
import { transactionApi } from '../api/transactionApi';
import {
  AnalyticsSummary,
  AnalyticsBreakdowns,
  AnalyticsFilterParams,
  AuthUser,
  Transaction,
} from '../types';

interface AnalyticsDashboardProps {
  currentUser?: AuthUser | null;
  onNavigateTab?: (tab: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [breakdowns, setBreakdowns] = useState<AnalyticsBreakdowns | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);

  // Date Filters
  const [datePreset, setDatePreset] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME'>('THIS_MONTH');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; val: number; date: string } | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      let start: string | undefined;
      let end: string | undefined;

      const now = new Date();
      if (datePreset === 'THIS_MONTH') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      } else if (datePreset === 'LAST_MONTH') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      }

      const filterParams: AnalyticsFilterParams = {
        startDate: start,
        endDate: end,
        groupBy: 'DAY',
      };

      const [summaryRes, breakdownRes, txnsRes] = await Promise.all([
        analyticsApi.getSummary(filterParams),
        analyticsApi.getBreakdowns(filterParams),
        transactionApi.getTransactions({ page: 0, size: 6 }).catch(() => null),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (breakdownRes.success) setBreakdowns(breakdownRes.data);
      if (txnsRes && txnsRes.content) {
        setRecentTxns(txnsRes.content);
      }
    } catch {
      // Keep previous data gracefully
    }
  }, [datePreset]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return '$ 0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Wave Chart Data - Smooth Cubic Bezier Curves
  // Coordinates mapping matching the mockup's dual wave lines
  const wavePoints = useMemo(() => {
    return [
      { x: 40, y: 135, val: 46200, date: '01' },
      { x: 95, y: 155, val: 42100, date: '05' },
      { x: 150, y: 138, val: 47500, date: '09' },
      { x: 210, y: 158, val: 41800, date: '13' },
      { x: 270, y: 70, val: 56900, date: '17' },
      { x: 330, y: 152, val: 43200, date: '21' },
      { x: 390, y: 130, val: 48500, date: '26' },
      { x: 440, y: 125, val: 49200, date: '31' },
    ];
  }, []);

  const dashedPoints = useMemo(() => {
    return [
      { x: 40, y: 120 },
      { x: 100, y: 132 },
      { x: 170, y: 148 },
      { x: 240, y: 125 },
      { x: 290, y: 75 },
      { x: 345, y: 92 },
      { x: 400, y: 132 },
      { x: 440, y: 140 },
    ];
  }, []);

  // Generate SVG Cubic Bezier Smooth Curve Path
  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const mainWavePath = useMemo(() => generateSmoothPath(wavePoints), [wavePoints]);
  const dashedWavePath = useMemo(() => generateSmoothPath(dashedPoints), [dashedPoints]);

  // Client Retention Dual Pin-Bar Chart
  const pinBars = useMemo(() => {
    return [
      { id: 1, topH: 75, btmH: 15 },
      { id: 2, topH: 45, btmH: 22 },
      { id: 3, topH: 88, btmH: 12 },
      { id: 4, topH: 35, btmH: 18 },
      { id: 5, topH: 52, btmH: 25 },
      { id: 6, topH: 125, btmH: 8 },
      { id: 7, topH: 62, btmH: 16 },
      { id: 8, topH: 42, btmH: 20 },
      { id: 9, topH: 70, btmH: 14 },
      { id: 10, topH: 95, btmH: 28 },
      { id: 11, topH: 60, btmH: 15 },
      { id: 12, topH: 80, btmH: 22 },
      { id: 13, topH: 110, btmH: 10 },
      { id: 14, topH: 118, btmH: 12 },
      { id: 15, topH: 78, btmH: 18 },
      { id: 16, topH: 105, btmH: 14 },
    ];
  }, []);

  // Top category from breakdowns
  const topCategoryName = useMemo(() => {
    return breakdowns?.expensesByCategory?.[0]?.categoryName || 'Sales';
  }, [breakdowns]);

  const topCategoryPercent = useMemo(() => {
    const p = breakdowns?.expensesByCategory?.[0]?.percentage;
    return p !== undefined ? `${p.toFixed(1)}%` : '83.2%';
  }, [breakdowns]);

  const topCategoryAmount = useMemo(() => {
    const a = breakdowns?.expensesByCategory?.[0]?.amount;
    return a !== undefined ? `$ ${a.toLocaleString()}` : '$ 17,840';
  }, [breakdowns]);

  // Cardholder Name
  const cardHolderName = (currentUser?.fullName || 'JOSH DECKER').toUpperCase();

  // Preset Date Display
  const dateRangeDisplay = useMemo(() => {
    if (datePreset === 'THIS_MONTH') return '01.09 - 30.09';
    if (datePreset === 'LAST_MONTH') return '01.08 - 31.08';
    return 'All Time';
  }, [datePreset]);

  // Mockup Recent Transactions List with fallbacks
  const streamItems = useMemo(() => {
    if (recentTxns && recentTxns.length >= 4) {
      return recentTxns.slice(0, 6).map((t) => ({
        id: t.id,
        name: t.recipientTo || t.payerFrom || 'Transaction',
        note: t.category?.name || 'General Payment',
        amount: t.transactionType === 'IN' ? `+$${t.amount}` : `-$${t.amount}`,
        isIncome: t.transactionType === 'IN',
        icon: t.transactionType === 'IN' ? 'user' : 'dropbox',
      }));
    }
    return [
      { id: '1', name: 'Dropbox', note: 'Account renewal', amount: '-$99.00', isIncome: false, icon: 'dropbox' },
      { id: '2', name: 'Johny Vino', note: 'Invoice #8529', amount: '+$37,200', isIncome: true, icon: 'doc' },
      { id: '3', name: 'Apple', note: 'App Store', amount: '-$14.90', isIncome: false, icon: 'apple' },
      { id: '4', name: 'Yoga Perdana', note: 'Invoice #8532', amount: '+$83,500', isIncome: true, icon: 'user' },
      { id: '5', name: 'Spotify', note: 'Family membership', amount: '-$15.00', isIncome: false, icon: 'spotify' },
      { id: '6', name: 'Hotjar', note: 'Account renewal', amount: '-$289.00', isIncome: false, icon: 'hotjar' },
    ];
  }, [recentTxns]);

  return (
    <div className="fintech-dashboard-wrapper">
      {/* ==================== 1. Left Icon Sidebar ==================== */}
      <aside className="fintech-sidebar">
        {/* Top: User Avatar with Active Dot */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbcfe8 0%, #f43f5e 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                color: '#ffffff',
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(244, 63, 94, 0.25)',
              }}
            >
              {currentUser?.fullName?.charAt(0) || 'J'}
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '2px solid #ffffff',
              }}
            />
          </div>

          {/* Navigation Icons Stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Active Card Icon */}
            <div
              className="fintech-sidebar-icon active"
              title="Card Analytics"
              onClick={() => onNavigateTab?.('analytics')}
            >
              <CreditCard size={20} />
            </div>

            {/* Transactions Ledger */}
            <div
              className="fintech-sidebar-icon"
              title="Transactions Ledger"
              onClick={() => onNavigateTab?.('transactions')}
            >
              <Receipt size={20} />
            </div>

            {/* Reimbursements / Activity */}
            <div
              className="fintech-sidebar-icon"
              title="Reimbursements"
              onClick={() => onNavigateTab?.('reimbursements')}
            >
              <Bell size={20} />
            </div>

            {/* Reports */}
            <div
              className="fintech-sidebar-icon"
              title="Reports"
              onClick={() => onNavigateTab?.('reports')}
            >
              <BarChart3 size={20} />
            </div>

            {/* Categories & Settings */}
            <div
              className="fintech-sidebar-icon"
              title="Categories"
              onClick={() => onNavigateTab?.('categories')}
            >
              <Gift size={20} />
            </div>
          </div>
        </div>

        {/* Bottom: Exit Icon */}
        <div
          className="fintech-sidebar-icon"
          title="Sign Out"
          onClick={() => {
            localStorage.removeItem('cams_token');
            window.location.reload();
          }}
        >
          <LogOut size={20} />
        </div>
      </aside>

      {/* ==================== 2. Main Center Content ==================== */}
      <main style={{ flex: 1, padding: '1.75rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowX: 'hidden' }}>
        {/* Top Header Bar */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
              Card analytics
            </h1>

            {/* Date Pill Selector */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '24px',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <span
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    borderRadius: '50%',
                    padding: '2px 5px',
                    lineHeight: 1,
                  }}
                >
                  ueno.
                </span>
                <span>{dateRangeDisplay}</span>
                <ChevronDown size={14} style={{ color: '#a1a1aa' }} />
              </button>

              {/* Date Presets Dropdown */}
              {showDatePicker && (
                <div
                  style={{
                    position: 'absolute',
                    top: '115%',
                    left: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
                    border: '1px solid #f1f5f9',
                    padding: '0.4rem',
                    zIndex: 50,
                    minWidth: '150px',
                  }}
                >
                  <button
                    onClick={() => { setDatePreset('THIS_MONTH'); setShowDatePicker(false); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: datePreset === 'THIS_MONTH' ? '#f1f5f9' : 'transparent',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#1e293b',
                    }}
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => { setDatePreset('LAST_MONTH'); setShowDatePicker(false); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: datePreset === 'LAST_MONTH' ? '#f1f5f9' : 'transparent',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#1e293b',
                    }}
                  >
                    Last Month
                  </button>
                  <button
                    onClick={() => { setDatePreset('ALL_TIME'); setShowDatePicker(false); }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: datePreset === 'ALL_TIME' ? '#f1f5f9' : 'transparent',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      color: '#1e293b',
                    }}
                  >
                    All Time
                  </button>
                </div>
              )}
            </div>

            {/* Add Circle Button */}
            <button
              onClick={() => onNavigateTab?.('transactions')}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.04)',
              }}
              title="Add Transaction"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Right Icons: Search & Notification Bell */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', color: '#94a3b8' }}>
            <Search size={19} style={{ cursor: 'pointer' }} />
            <Bell size={19} style={{ cursor: 'pointer' }} />
          </div>
        </header>

        {/* ==================== 3. Row 1: Top 3 Stat Cards ==================== */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {/* Card 1: Transactions */}
          <div className="fintech-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Transactions</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f3e8ff',
                  color: '#9333ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                →|
              </div>
            </div>
            <div style={{ fontSize: '1.95rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {summary?.completedTransactionCount ? Number(summary.completedTransactionCount).toLocaleString() : '18,417'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0d9488' }}>
              7.34% ↗ <span style={{ color: '#64748b', fontWeight: 500 }}>more than last month</span>
            </div>
          </div>

          {/* Card 2: Authorizations (Elevated) */}
          <div className="fintech-card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Authorizations</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={16} strokeWidth={3} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.95rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {summary?.reimbursementSubmittedCount ? Number(summary.reimbursementSubmittedCount).toLocaleString() : '24,320'}
              </span>
              <span
                style={{
                  backgroundColor: '#ffe4e6',
                  color: '#e11d48',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                }}
              >
                NEEDS ATTENTION
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e11d48' }}>
              3.18% ↘ <span style={{ color: '#64748b', fontWeight: 500 }}>going down</span>
            </div>
          </div>

          {/* Card 3: Approvals */}
          <div className="fintech-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155' }}>Approvals</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#fef3c7',
                  color: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Check size={16} strokeWidth={3} />
              </div>
            </div>
            <div style={{ fontSize: '1.95rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {summary?.reimbursementApprovedCount ? Number(summary.reimbursementApprovedCount).toLocaleString() : '9,564'}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              0.32% ↗ <span style={{ color: '#64748b', fontWeight: 500 }}>looks pretty good</span>
            </div>
          </div>
        </section>

        {/* ==================== 4. Row 2: Revenue Wave Chart & Goal Overview ==================== */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: '1.5rem' }}>
          {/* Revenue Smooth Wave Chart */}
          <div className="fintech-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Revenue</span>
              <Settings size={16} style={{ color: '#94a3b8', cursor: 'pointer' }} />
            </div>

            {/* Dual Headline Metrics */}
            <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'baseline' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>This month</div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f43f5e', marginTop: '0.15rem' }}>
                  {summary?.totalOutAmount ? formatCurrency(summary.totalOutAmount) : '$ 815,390'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Last month</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#94a3b8', marginTop: '0.15rem' }}>
                  $ 743,950
                </div>
              </div>
            </div>

            {/* SVG Wave Canvas */}
            <div style={{ position: 'relative', width: '100%', height: '185px', marginTop: '0.5rem' }}>
              <svg width="100%" height="100%" viewBox="0 0 460 185" style={{ overflow: 'visible' }}>
                {/* Horizontal Light Guide Lines */}
                {[
                  { y: 35, label: '60k' },
                  { y: 65, label: '55k' },
                  { y: 95, label: '50k' },
                  { y: 125, label: '45k' },
                  { y: 155, label: '40k' },
                ].map((g) => (
                  <g key={g.label}>
                    <line x1="35" y1={g.y} x2="455" y2={g.y} stroke="#f1f5f9" strokeWidth="1" />
                    <text x="30" y={g.y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="500">
                      {g.label}
                    </text>
                  </g>
                ))}

                {/* Dashed Comparison Wave (Gray) */}
                <path
                  d={dashedWavePath}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Solid Primary Curve (Vibrant Purple/Pink Wave) */}
                <path
                  d={mainWavePath}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 4px 10px rgba(139, 92, 246, 0.25))' }}
                />

                {/* Interactive Points on Main Curve */}
                {wavePoints.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.x === pt.x ? 5.5 : 3.5}
                    fill="#ffffff"
                    stroke="#8b5cf6"
                    strokeWidth="2.5"
                    style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* X-Axis Date Labels */}
                {wavePoints.map((pt) => (
                  <text
                    key={pt.date}
                    x={pt.x}
                    y={178}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#94a3b8"
                    fontWeight="500"
                  >
                    {pt.date}
                  </text>
                ))}
              </svg>

              {/* Hover Tooltip */}
              {hoveredPoint && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${hoveredPoint.y - 42}px`,
                    left: `${Math.min(390, Math.max(10, hoveredPoint.x - 45))}px`,
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  Day {hoveredPoint.date}: ${hoveredPoint.val.toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Goal Overview Open Radial Gauge */}
          <div className="fintech-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Goal overview</span>
              <HelpCircle size={16} style={{ color: '#94a3b8', cursor: 'pointer' }} />
            </div>

            {/* Circular Gauge */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', margin: '0.5rem 0' }}>
              <svg width="170" height="150" viewBox="0 0 170 150">
                <defs>
                  <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                {/* Background Arc (Gray) */}
                <path
                  d="M 30 130 A 62 62 0 1 1 140 130"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Progress Arc (Cyan to Emerald) */}
                <path
                  d="M 30 130 A 62 62 0 1 1 140 130"
                  fill="none"
                  stroke="url(#gaugeGradient)"
                  strokeWidth="8"
                  strokeDasharray="280"
                  strokeDashoffset="60"
                  strokeLinecap="round"
                />
              </svg>

              {/* Center 83% Text */}
              <div
                style={{
                  position: 'absolute',
                  top: '46%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#64748b', letterSpacing: '-0.03em' }}>
                  83%
                </div>
              </div>
            </div>

            {/* Split Bottom Counters */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                paddingTop: '0.75rem',
                borderTop: '1px solid #f1f5f9',
                textAlign: 'center',
              }}
            >
              <div style={{ borderRight: '1px solid #f1f5f9', paddingRight: '0.5rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Completed</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                  {summary?.completedTransactionCount ? `${summary.completedTransactionCount} txns` : '318,240'}
                </div>
              </div>
              <div style={{ paddingLeft: '0.5rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>In progress</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
                  {summary?.reimbursementSubmittedCount ? `${summary.reimbursementSubmittedCount} claims` : '84,312'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== 5. Row 3: Sales Goal & Client Retention Pin-Bars ==================== */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.5rem' }}>
          {/* Sales / Monthly Goal Card */}
          <div className="fintech-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{topCategoryName}</span>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Monthly goal</span>
            </div>

            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
              {topCategoryPercent}
            </div>

            {/* Horizontal Progress Bar */}
            <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: topCategoryPercent, height: '100%', backgroundColor: '#0d9488', borderRadius: '4px' }} />
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0d9488' }}>
              19.3% ↗ <span style={{ color: '#64748b', fontWeight: 500 }}>{topCategoryAmount} total volume</span>
            </div>
          </div>

          {/* Client Retention Thin Pin-Bar Chart */}
          <div className="fintech-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Client retention</span>
              <Settings size={16} style={{ color: '#94a3b8', cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', height: '110px', alignItems: 'flex-end', gap: '0.5rem', position: 'relative' }}>
              {/* Y-Axis scale */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', fontSize: '0.68rem', color: '#94a3b8', paddingRight: '0.5rem', fontWeight: 500 }}>
                <span>200K</span>
                <span>100K</span>
                <span>0</span>
              </div>

              {/* Pin-bars stream */}
              <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'flex-end', height: '100%' }}>
                {pinBars.map((bar) => (
                  <div key={bar.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    {/* Upper Purple Pin */}
                    <div
                      style={{
                        width: '3.5px',
                        height: `${bar.topH}px`,
                        backgroundColor: '#8b5cf6',
                        borderRadius: '2px',
                        marginBottom: '3px',
                      }}
                    />
                    {/* Lower Cyan Pin */}
                    <div
                      style={{
                        width: '3.5px',
                        height: `${bar.btmH}px`,
                        backgroundColor: '#06b6d4',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== 6. Far Right Floating Card & Recent Stream Column ==================== */}
      <aside style={{ width: '310px', backgroundColor: '#ffffff', borderLeft: '1px solid rgba(0, 0, 0, 0.04)', padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', flexShrink: 0 }}>
        {/* Floating 3D Blue VISA Card */}
        <div className="floating-visa-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2.5px solid #ffffff', display: 'inline-block' }} />
              Jago
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, fontStyle: 'italic', letterSpacing: '0.04em' }}>
              VISA
            </span>
          </div>

          {/* EMV Gold Chip */}
          <div className="emv-chip" style={{ marginBottom: '1.1rem' }} />

          {/* Card Number */}
          <div style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.14em', fontFamily: 'monospace', textShadow: '0 1px 3px rgba(0,0,0,0.3)', marginBottom: '1.25rem' }}>
            4271 &nbsp;8450 &nbsp;0027 &nbsp;4505
          </div>

          {/* Cardholder & Expiry */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            <span style={{ fontWeight: 700 }}>{cardHolderName}</span>
            <div style={{ textAlign: 'right', fontSize: '0.62rem' }}>
              <div style={{ opacity: 0.8 }}>VALID THRU ▶</div>
              <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>05/28</div>
            </div>
          </div>
        </div>

        {/* Balance & Change Mini Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Balance</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.1rem' }}>
              {summary?.netAmount !== undefined ? formatCurrency(summary.netAmount) : '$ 130,590'}
            </div>
            {/* Sparkline */}
            <svg width="65" height="18" viewBox="0 0 65 18" style={{ marginTop: '0.2rem' }}>
              <path d="M 2 12 Q 18 2, 34 11 T 63 8" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>Change</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0d9488', marginTop: '0.1rem' }}>
              3.21% ↗
            </div>
            {/* Sparkline */}
            <svg width="65" height="18" viewBox="0 0 65 18" style={{ marginTop: '0.2rem' }}>
              <path d="M 2 14 Q 20 6, 38 12 T 63 5" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Recent Transactions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
            Recent transactions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {streamItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: item.isIncome ? '#e0f2fe' : '#f8fafc',
                      color: item.isIncome ? '#0284c7' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon === 'dropbox' && <Layers size={16} />}
                    {item.icon === 'doc' && <FileText size={16} />}
                    {item.icon === 'apple' && <ShoppingBag size={16} />}
                    {item.icon === 'user' && <UserIcon size={16} />}
                    {item.icon === 'spotify' && <Music size={16} />}
                    {item.icon === 'hotjar' && <Flame size={16} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {item.note}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: item.isIncome ? '#0d9488' : '#f43f5e',
                  }}
                >
                  {item.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud Detection / Voice Transcript Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
            Fraud detection
          </div>

          {/* Equalizer Wave Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Play size={15} fill="#ffffff" style={{ marginLeft: '2px' }} />
            </button>

            {/* Audio Wave Soundbars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1, height: '24px' }}>
              {[6, 14, 22, 10, 18, 24, 16, 8, 20, 12, 18, 10, 14, 6].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    height: `${h}px`,
                    backgroundColor: '#10b981',
                    borderRadius: '2px',
                    opacity: 0.75,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Transcript Pill Card */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid #f1f5f9',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={14} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b' }}>
                Transcript
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                780KB | 14min read
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
