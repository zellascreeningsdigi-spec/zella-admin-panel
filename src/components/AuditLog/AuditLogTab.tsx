import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import { apiService } from '@/services/api';

type Severity = 'info' | 'success' | 'warning' | 'danger';

type AuditLog = {
  _id: string;
  action: string;
  entityType?: string;
  entityId?: string;
  userId?: { _id?: string; name?: string; email?: string; role?: string } | null;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
  createdAt: string;
  summary: string;
  detail: string;
  severity: Severity;
};

type Stats = {
  total?: number;
  byAction?: Array<{ _id: string; count: number }>;
  retentionPolicy?: { retentionDays?: number };
};

const PAGE_SIZE = 25;

const ALL_ACTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All actions' },
  { value: 'login', label: 'Sign-in succeeded' },
  { value: 'logout', label: 'Sign-out' },
  { value: 'otp_sent', label: 'OTP sent' },
  { value: 'otp_failed', label: 'Wrong OTP entered' },
  { value: 'otp_locked', label: 'OTP locked' },
  { value: 'login_blocked_ip', label: 'Sign-in blocked: IP not whitelisted' },
  { value: 'login_blocked_password_expired', label: 'Sign-in blocked: password expired' },
  { value: 'password_reset', label: 'Password reset' },
  { value: 'password_reset_failed', label: 'Password reset failed' },
  { value: 'password_reminder_sent', label: 'Password reminder emailed' },
  { value: 'profile_updated', label: 'Profile updated' },
  { value: 'case_created', label: 'Case created' },
  { value: 'case_updated', label: 'Case updated' },
  { value: 'case_deleted', label: 'Case deleted' },
  { value: 'case_bulk_created', label: 'Cases bulk-created' },
  { value: 'customer_created', label: 'Customer created' },
  { value: 'customer_updated', label: 'Customer updated' },
  { value: 'customer_deleted', label: 'Customer deleted' },
  { value: 'customers_bulk_uploaded', label: 'Customers bulk-uploaded' },
  { value: 'report_created', label: 'Report created' },
  { value: 'report_submitted', label: 'Report submitted' },
  { value: 'report_deleted', label: 'Report deleted' },
  { value: 'digilocker_initiated', label: 'DigiLocker started' },
  { value: 'digilocker_auth_success', label: 'DigiLocker succeeded' },
  { value: 'digilocker_auth_failed', label: 'DigiLocker failed' },
  { value: 'admin_user_created', label: 'Admin user created' },
  { value: 'admin_user_updated', label: 'Admin user updated' },
  { value: 'admin_user_deleted', label: 'Admin user deleted' },
  { value: 'system_error', label: 'System error' }
];

const SEVERITY_DOT: Record<Severity, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500'
};

const SEVERITY_BADGE: Record<Severity, string> = {
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200'
};

const relativeTime = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const sec = Math.round(ms / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
};

const AuditLogTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLogs = async (overrides?: { page?: number }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAuditLogs({
        page: overrides?.page ?? page,
        limit: PAGE_SIZE,
        action: actionFilter || undefined,
        severity: severityFilter || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });
      if (response.success && response.data) {
        setLogs(response.data.logs as AuditLog[]);
        setTotalPages(response.data.pagination.totalPages || 1);
        setTotalLogs(response.data.pagination.totalLogs || 0);
      }
    } catch (err: any) {
      console.error('Audit log load failed:', err);
      setError(err?.message || 'Failed to load audit logs.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiService.getAuditLogStats();
      if (response.success) setStats(response.data);
    } catch (err) {
      // Stats are non-critical; silently ignore
      console.error('Audit log stats failed:', err);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadLogs({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, severityFilter, search, startDate, endDate]);

  const headerStats = useMemo(() => {
    const counts: Record<string, number> = {};
    (stats?.byAction || []).forEach((entry) => {
      counts[entry._id] = entry.count;
    });
    return {
      total: stats?.total ?? 0,
      logins: counts['login'] || 0,
      failures:
        (counts['otp_failed'] || 0) +
        (counts['otp_locked'] || 0) +
        (counts['login_blocked_ip'] || 0) +
        (counts['login_blocked_password_expired'] || 0),
      passwordResets: (counts['password_reset'] || 0) + (counts['password_reset_failed'] || 0)
    };
  }, [stats]);

  const onApplyFilters = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const onClearFilters = () => {
    setActionFilter('');
    setSeverityFilter('');
    setSearchInput('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-gray-700" />
            Audit Logs
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Every security and admin event is recorded here. Logs are retained for {stats?.retentionPolicy?.retentionDays ?? 10} days.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadStats(); loadLogs({ page }); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total events</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{headerStats.total}</div>
            <p className="text-xs text-muted-foreground">In the retention window</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful sign-ins</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{headerStats.logins}</div>
            <p className="text-xs text-muted-foreground">Email + password + OTP</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed / blocked</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{headerStats.failures}</div>
            <p className="text-xs text-muted-foreground">Wrong OTP, IP block, expiry</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Password resets</CardTitle>
            <KeyRound className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{headerStats.passwordResets}</div>
            <p className="text-xs text-muted-foreground">Self-service and forced</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Narrow the log feed by event type, severity, time, or text.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="audit-action" className="text-xs">Event type</Label>
              <select
                id="audit-action"
                className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              >
                {ALL_ACTIONS.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="audit-severity" className="text-xs">Severity</Label>
              <select
                id="audit-severity"
                className="mt-1 w-full border border-gray-300 rounded-md px-2 py-2 text-sm bg-white"
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              >
                <option value="">All severities</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="danger">Danger</option>
              </select>
            </div>
            <div>
              <Label htmlFor="audit-from" className="text-xs">From</Label>
              <Input
                id="audit-from"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <Label htmlFor="audit-to" className="text-xs">To</Label>
              <Input
                id="audit-to"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              />
            </div>
            <div>
              <Label htmlFor="audit-search" className="text-xs">Search user/text</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="audit-search"
                  type="text"
                  placeholder="Name, email, message…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') onApplyFilters(); }}
                />
                <Button size="sm" onClick={onApplyFilters}>Apply</Button>
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>{totalLogs} matching event{totalLogs === 1 ? '' : 's'}</span>
            <button
              type="button"
              onClick={onClearFilters}
              className="text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
          <CardDescription>Newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
              {error}
            </div>
          )}
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm">Loading audit logs…</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              No audit logs match these filters.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const isOpen = expandedId === log._id;
                const userName = log.userId?.name || 'System';
                const userEmail = log.userId?.email;
                const userRole = log.userId?.role;
                return (
                  <div key={log._id} className="py-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${SEVERITY_DOT[log.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{log.summary}</span>
                          <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${SEVERITY_BADGE[log.severity]}`}>
                            {log.severity}
                          </span>
                        </div>
                        {log.detail && (
                          <p className="text-xs text-gray-600 mt-0.5">{log.detail}</p>
                        )}
                        <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>
                            <span className="font-medium">{userName}</span>
                            {userEmail && <span className="text-gray-400"> &lt;{userEmail}&gt;</span>}
                            {userRole && <span className="text-gray-400"> · {userRole}</span>}
                          </span>
                          {log.ipAddress && <span>IP {log.ipAddress}</span>}
                          <button
                            type="button"
                            onClick={() => setExpandedId(isOpen ? null : log._id)}
                            className="text-blue-600 hover:underline"
                          >
                            {isOpen ? 'Hide raw' : 'View raw'}
                          </button>
                        </div>
                        {isOpen && (
                          <pre className="mt-2 bg-gray-50 border border-gray-200 rounded p-2 text-[11px] text-gray-700 overflow-x-auto">
{JSON.stringify({
  action: log.action,
  entityType: log.entityType,
  entityId: log.entityId,
  details: log.details,
  errorMessage: log.errorMessage,
  success: log.success,
  userAgent: log.userAgent
}, null, 2)}
                          </pre>
                        )}
                      </div>
                      <div
                        className="text-xs text-gray-400 shrink-0"
                        title={new Date(log.createdAt).toLocaleString()}
                      >
                        {relativeTime(log.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogTab;
