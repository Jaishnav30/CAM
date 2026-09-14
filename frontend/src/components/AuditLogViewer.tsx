import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  RefreshCw,
  AlertCircle,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  Code2,
} from 'lucide-react';
import { auditApi } from '../api/auditApi';
import { AuditLogItem, AuditLogFilterParams } from '../types';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(0);
  const [pageSize] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Filters
  const [entityType, setEntityType] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Selected Log for JSON Inspection Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async (targetPage: number = page) => {
    setLoading(true);
    setError(null);
    try {
      const params: AuditLogFilterParams = {
        entityType: entityType || undefined,
        action: action || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: targetPage,
        size: pageSize,
      };

      const res = await auditApi.getAuditLogs(params);
      if (res.success) {
        setLogs(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
        setPage(res.data.page);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retrieve audit log records.');
    } finally {
      setLoading(false);
    }
  }, [entityType, action, startDate, endDate, page, pageSize]);

  useEffect(() => {
    fetchLogs(0);
  }, [entityType, action, startDate, endDate]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      fetchLogs(newPage);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionBadgeClass = (actionName: string) => {
    switch (actionName) {
      case 'CREATE':
      case 'APPROVE':
        return 'badge-success';
      case 'UPDATE':
      case 'STATUS_CHANGE':
        return 'badge-info';
      case 'ARCHIVE':
        return 'badge-warning';
      case 'REJECT':
      case 'DELETE':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  };

  const parseJsonPretty = (jsonString?: string) => {
    if (!jsonString) return 'None';
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Filter Card */}
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
                Audit Trail & Regulatory Ledger
              </h2>
              <span className="badge badge-success" style={{ textTransform: 'none' }}>
                Immutable
              </span>
            </div>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Strictly append-only log capturing user actions, financial lifecycle transitions, and data modifications.
            </p>
          </div>

          <button
            className="btn btn-outline"
            style={{ fontSize: 'var(--font-size-xs)', padding: '0.4rem 0.75rem' }}
            onClick={() => fetchLogs(page)}
            disabled={loading}
            title="Refresh Audit Logs"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Filter Bar */}
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
          {/* Entity Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Entity:
            </span>
            <select
              className="form-input"
              style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            >
              <option value="">All Entities</option>
              <option value="TRANSACTION">TRANSACTION</option>
              <option value="REIMBURSEMENT">REIMBURSEMENT</option>
              <option value="DOCUMENT">DOCUMENT</option>
              <option value="CATEGORY">CATEGORY</option>
              <option value="USER">USER</option>
            </select>
          </div>

          {/* Action Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Action:
            </span>
            <select
              className="form-input"
              style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: 'var(--font-size-xs)' }}
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="ARCHIVE">ARCHIVE</option>
              <option value="APPROVE">APPROVE</option>
              <option value="REJECT">REJECT</option>
              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
              <option value="UPLOAD">UPLOAD</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Start Date */}
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

          {/* End Date */}
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

          {(entityType || action || startDate || endDate) && (
            <button
              className="btn btn-outline"
              style={{ fontSize: 'var(--font-size-xs)', padding: '0.3rem 0.6rem' }}
              onClick={() => {
                setEntityType('');
                setAction('');
                setStartDate('');
                setEndDate('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Security / Immutability Banner */}
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
          <Lock size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Immutability Guarantee:</strong> Audit logs are append-only. No modification, update, or deletion
            endpoints exist in CAMS. All security-relevant events are synchronously persisted with actor ID and IP addresses.
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

      {/* Logs Table */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
              Activity Log Records
            </h3>
          </div>
          <span className="badge badge-info" style={{ textTransform: 'none' }}>
            {totalElements} total log entries recorded
          </span>
        </div>

        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            No audit records match the selected filters.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Performed By</th>
                  <th>IP Address</th>
                  <th>State Changes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ fontSize: '0.65rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        {log.entityType}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)' }} title={log.entityId}>
                      {log.entityId.length > 8 ? `${log.entityId.slice(0, 8)}…` : log.entityId}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 'var(--font-size-xs)' }}>
                          {log.performedBy ? log.performedBy.fullName : 'System'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {log.performedBy ? log.performedBy.email : 'system@cams.internal'}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td>
                      {log.oldValues || log.newValues ? (
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: 'var(--font-size-xs)', padding: '0.25rem 0.5rem' }}
                          onClick={() => setSelectedLog(log)}
                        >
                          <Code2 size={13} />
                          Inspect
                        </button>
                      ) : (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                          None
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              Page {page + 1} of {totalPages} ({totalElements} total entries)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                disabled={page === 0}
                onClick={() => handlePageChange(page - 1)}
              >
                <ChevronLeft size={14} />
                Previous
              </button>
              <button
                className="btn btn-outline"
                style={{ padding: '0.35rem 0.6rem', fontSize: 'var(--font-size-xs)' }}
                disabled={page >= totalPages - 1}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* State Changes Inspection Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: '720px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                  Audit Details: {selectedLog.action} on {selectedLog.entityType}
                </h3>
              </div>
              <button
                className="btn btn-outline"
                style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)' }}
                onClick={() => setSelectedLog(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-xs)',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Entity ID:</span>
                <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedLog.entityId}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Performed By:</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedLog.performedBy ? selectedLog.performedBy.fullName : 'System'} (
                  {selectedLog.performedBy ? selectedLog.performedBy.email : 'system@cams.internal'})
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Timestamp:</span>
                <div>{formatTimestamp(selectedLog.createdAt)}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>IP Address:</span>
                <div style={{ fontFamily: 'monospace' }}>{selectedLog.ipAddress || '127.0.0.1'}</div>
              </div>
            </div>

            {/* Old vs New Values */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {selectedLog.oldValues && (
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-expense)', marginBottom: '0.25rem' }}>
                    PREVIOUS STATE (OLD VALUES):
                  </div>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {parseJsonPretty(selectedLog.oldValues)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-income)', marginBottom: '0.25rem' }}>
                    UPDATED STATE (NEW VALUES):
                  </div>
                  <pre
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-size-xs)',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {parseJsonPretty(selectedLog.newValues)}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn btn-outline" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
