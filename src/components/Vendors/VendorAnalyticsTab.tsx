import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { apiService } from '@/services/api';

interface VendorRow {
  vendorId: string;
  vendorName: string;
  type: string;
  price: number;
  total: number;
  notStarted: number;
  inProgress: number;
  verified: number;
  disputed: number;
  avgTurnaroundMs: number | null;
  estimatedCost: number;
}

interface Filters {
  vendorId: string;
  dateFrom: string;
  dateTo: string;
  companyName: string;
  city: string;
  state: string;
}

const emptyFilters: Filters = { vendorId: '', dateFrom: '', dateTo: '', companyName: '', city: '', state: '' };

const OUTCOME_COLORS = { verified: '#16a34a', disputed: '#dc2626', inProgress: '#7c3aed', notStarted: '#9ca3af' };

// Format a millisecond duration as a human turnaround (h / d).
const fmtTurnaround = (ms: number | null | undefined) => {
  if (ms == null || Number.isNaN(ms)) return '—';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

const VendorAnalyticsTab = () => {
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [totals, setTotals] = useState<any>({ total: 0, verified: 0, disputed: 0, inProgress: 0, notStarted: 0, estimatedCost: 0, vendors: 0 });
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<{ _id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Member drill-down state
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.getVendorAnalytics({
        vendorId: filters.vendorId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        companyName: filters.companyName || undefined,
        city: filters.city || undefined,
        state: filters.state || undefined,
      });
      if (res.success && res.data) {
        setRows(res.data.perVendor || []);
        setTotals(res.data.totals || {});
      }
    } catch (error) {
      console.error('Failed to load vendor analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.getVendors({ isActive: true, limit: 200 });
        if (res.success && res.data) setVendors(res.data.vendors || []);
      } catch (e) {
        console.error('Failed to load vendor list:', e);
      }
    })();
  }, []);

  const toggleMembers = async (vendorId: string) => {
    if (expandedVendor === vendorId) {
      setExpandedVendor(null);
      return;
    }
    setExpandedVendor(vendorId);
    setMembersLoading(true);
    try {
      const res = await apiService.getVendorMemberAnalytics(vendorId);
      setMembers(res.success && res.data ? res.data.members : []);
    } catch (e) {
      console.error('Failed to load member analytics:', e);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };

  const setFilter = (k: keyof Filters, v: string) => setFilters((f) => ({ ...f, [k]: v }));
  const clearFilters = () => setFilters(emptyFilters);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const outcomePie = [
    { name: 'Verified', value: totals.verified || 0, key: 'verified' },
    { name: 'Disputed', value: totals.disputed || 0, key: 'disputed' },
    { name: 'In Progress', value: totals.inProgress || 0, key: 'inProgress' },
    { name: 'Not Started', value: totals.notStarted || 0, key: 'notStarted' },
  ].filter((d) => d.value > 0);

  const barData = rows.map((r) => ({
    name: r.vendorName.length > 14 ? r.vendorName.slice(0, 13) + '…' : r.vendorName,
    verified: r.verified,
    disputed: r.disputed,
    inProgress: r.inProgress,
    notStarted: r.notStarted,
    turnaroundH: r.avgTurnaroundMs ? +(r.avgTurnaroundMs / 3600000).toFixed(1) : 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Vendor Analytics</h2>
        <p className="text-sm sm:text-base text-gray-500">
          Performance, turnaround and estimated cost across address-verification vendors.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-1 text-sm font-medium text-gray-700"
            onClick={() => setShowFilters((s) => !s)}
          >
            Filters {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="f-vendor">Vendor</Label>
              <select
                id="f-vendor"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filters.vendorId}
                onChange={(e) => setFilter('vendorId', e.target.value)}
              >
                <option value="">All vendors</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="f-from">Created From</Label>
              <Input id="f-from" type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="f-to">Created To</Label>
              <Input id="f-to" type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="f-company">Company</Label>
              <Input id="f-company" value={filters.companyName} onChange={(e) => setFilter('companyName', e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <Label htmlFor="f-city">City</Label>
              <Input id="f-city" value={filters.city} onChange={(e) => setFilter('city', e.target.value)} placeholder="City" />
            </div>
            <div>
              <Label htmlFor="f-state">State</Label>
              <Input id="f-state" value={filters.state} onChange={(e) => setFilter('state', e.target.value)} placeholder="State" />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">Loading analytics...</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard label="Vendors" value={totals.vendors ?? rows.length} />
            <StatCard label="Total Assigned" value={totals.total ?? 0} />
            <StatCard label="Verified" value={totals.verified ?? 0} color="text-green-600" />
            <StatCard label="Disputed" value={totals.disputed ?? 0} color="text-red-600" />
            <StatCard label="In Progress" value={totals.inProgress ?? 0} color="text-purple-600" />
            <StatCard label="Est. Cost (₹)" value={Math.round(totals.estimatedCost ?? 0)} color="text-blue-600" />
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-lg font-medium text-gray-500">No vendor-assigned cases found</div>
              <div className="text-sm text-gray-400 mt-1">Assign cases to vendors to see analytics.</div>
            </div>
          ) : (
            <>
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">Cases by Vendor (outcome)</CardTitle></CardHeader>
                  <CardContent>
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="verified" stackId="a" fill={OUTCOME_COLORS.verified} />
                          <Bar dataKey="disputed" stackId="a" fill={OUTCOME_COLORS.disputed} />
                          <Bar dataKey="inProgress" stackId="a" fill={OUTCOME_COLORS.inProgress} />
                          <Bar dataKey="notStarted" stackId="a" fill={OUTCOME_COLORS.notStarted} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Overall Outcome Split</CardTitle></CardHeader>
                  <CardContent>
                    <div style={{ width: '100%', height: 300 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={outcomePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                            {outcomePie.map((entry) => (
                              <Cell key={entry.key} fill={(OUTCOME_COLORS as any)[entry.key]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader><CardTitle className="text-base">Avg Turnaround by Vendor (hours)</CardTitle></CardHeader>
                  <CardContent>
                    <div style={{ width: '100%', height: 280 }}>
                      <ResponsiveContainer>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="turnaroundH" fill="#2563eb" name="Avg turnaround (h)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Per-vendor breakdown */}
              <Card>
                <CardHeader><CardTitle className="text-base">Per-Vendor Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {/* Desktop table */}
                  <div className="overflow-x-auto hidden md:block">
                    <table className="w-full text-sm border">
                      <thead className="bg-gray-100 text-left">
                        <tr>
                          <th className="p-2 border">Vendor</th>
                          <th className="p-2 border">Type</th>
                          <th className="p-2 border">Total</th>
                          <th className="p-2 border">Verified</th>
                          <th className="p-2 border">Disputed</th>
                          <th className="p-2 border">In Progress</th>
                          <th className="p-2 border">Avg Turnaround</th>
                          <th className="p-2 border">Est. Cost (₹)</th>
                          <th className="p-2 border">Members</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => (
                          <Fragment key={r.vendorId}>
                            <tr>
                              <td className="p-2 border font-medium">{r.vendorName}</td>
                              <td className="p-2 border capitalize">{r.type}</td>
                              <td className="p-2 border">{r.total}</td>
                              <td className="p-2 border text-green-700">{r.verified}</td>
                              <td className="p-2 border text-red-700">{r.disputed}</td>
                              <td className="p-2 border text-purple-700">{r.inProgress}</td>
                              <td className="p-2 border">{fmtTurnaround(r.avgTurnaroundMs)}</td>
                              <td className="p-2 border">{r.estimatedCost}</td>
                              <td className="p-2 border">
                                {r.type === 'company' && (
                                  <Button variant="ghost" size="sm" onClick={() => toggleMembers(r.vendorId)}>
                                    {expandedVendor === r.vendorId ? 'Hide' : 'View'}
                                  </Button>
                                )}
                              </td>
                            </tr>
                            {expandedVendor === r.vendorId && (
                              <tr>
                                <td colSpan={9} className="p-2 border bg-gray-50">
                                  {membersLoading ? (
                                    <span className="text-gray-500">Loading members…</span>
                                  ) : members.length === 0 ? (
                                    <span className="text-gray-500">No member-assigned cases.</span>
                                  ) : (
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-left text-gray-500">
                                          <th className="p-1">Member</th><th className="p-1">Total</th>
                                          <th className="p-1">Verified</th><th className="p-1">Disputed</th>
                                          <th className="p-1">Avg Turnaround</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {members.map((m) => (
                                          <tr key={m.memberId}>
                                            <td className="p-1">{m.memberName}</td>
                                            <td className="p-1">{m.total}</td>
                                            <td className="p-1 text-green-700">{m.verified}</td>
                                            <td className="p-1 text-red-700">{m.disputed}</td>
                                            <td className="p-1">{fmtTurnaround(m.avgTurnaroundMs)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {rows.map((r) => (
                      <div key={r.vendorId} className="border rounded-md p-3 space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{r.vendorName}</span>
                          <span className="capitalize text-xs text-gray-500">{r.type}</span>
                        </div>
                        <div>Total: {r.total} · <span className="text-green-700">✓{r.verified}</span> · <span className="text-red-700">✕{r.disputed}</span> · <span className="text-purple-700">⋯{r.inProgress}</span></div>
                        <div>Turnaround: {fmtTurnaround(r.avgTurnaroundMs)} · Est. cost ₹{r.estimatedCost}</div>
                        {r.type === 'company' && (
                          <Button variant="outline" size="sm" className="w-full mt-1" onClick={() => toggleMembers(r.vendorId)}>
                            {expandedVendor === r.vendorId ? 'Hide members' : 'View members'}
                          </Button>
                        )}
                        {expandedVendor === r.vendorId && (
                          <div className="mt-2 space-y-1">
                            {membersLoading ? (
                              <span className="text-gray-500 text-xs">Loading…</span>
                            ) : members.length === 0 ? (
                              <span className="text-gray-500 text-xs">No member-assigned cases.</span>
                            ) : (
                              members.map((m) => (
                                <div key={m.memberId} className="text-xs border-t pt-1">
                                  <span className="font-medium">{m.memberName}</span> — {m.total} total, ✓{m.verified}, ✕{m.disputed}, {fmtTurnaround(m.avgTurnaroundMs)}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: number; color?: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-xl sm:text-2xl font-bold ${color || ''}`}>{value}</div>
    </CardContent>
  </Card>
);

export default VendorAnalyticsTab;
