import React from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { TrackerMeta, fmtMonth } from './trackerTypes';

// Tracker analytics for the filtered set of cases.

interface Props {
  meta: TrackerMeta;
  data: any | null;
  loading: boolean;
  onDrill: (patch: Record<string, any>) => void;
}

const STATUS_COLOURS: Record<string, string> = {
  WIP: '#3b82f6', Insuff: '#f59e0b', 'Client Suggestion': '#a855f7', 'Report Today': '#14b8a6',
  Report: '#06b6d4', Completed: '#22c55e', 'On Hold': '#9ca3af', Stopped: '#ef4444',
};
const TAT_COLOURS: Record<string, string> = { 'In TAT': '#22c55e', 'Due soon': '#f59e0b', 'Out of TAT': '#ef4444' };
const CHECK_COLOURS: Record<string, string> = {
  Pending: '#d1d5db', WIP: '#60a5fa', Insuff: '#fbbf24', Received: '#818cf8', Green: '#4ade80', Amber: '#fb923c',
  Red: '#f87171', 'Client Suggestion': '#c084fc', Hold: '#9ca3af', 'Unable to Verify': '#fb7185', Duplicate: '#94a3b8',
};

const Kpi: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string; onClick?: () => void }> = ({ label, value, hint, tone = 'text-gray-900', onClick }) => (
  <button type="button" onClick={onClick} disabled={!onClick} className={`text-left rounded-lg border bg-white p-4 ${onClick ? 'hover:border-brand-green hover:shadow-sm' : 'cursor-default'}`}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-2xl font-semibold mt-1 ${tone}`}>{value}</p>
    {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
  </button>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <Card className={className}>
    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle></CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const TrackerAnalytics: React.FC<Props> = ({ meta, data, loading, onDrill }) => {
  if (!data) {
    return <div className="py-16 text-center text-gray-400">{loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'No data'}</div>;
  }
  const t = data.totals;
  const checkTypes = meta.checkTypes.filter((ct) => data.checks.some((c: any) => c.type === ct.key));
  const checkRows = checkTypes.map((ct) => {
    const row: any = { name: ct.label };
    for (const c of data.checks.filter((x: any) => x.type === ct.key)) row[c.status] = c.n;
    return row;
  });
  const usedCheckStatuses = meta.checkStatuses.filter((s) => data.checks.some((c: any) => c.status === s));

  return (
    <div className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Kpi label="Total cases" value={t.total.toLocaleString('en-IN')} />
        <Kpi label="Open" value={t.open.toLocaleString('en-IN')} onClick={() => onDrill({ open: 'open' })} />
        <Kpi label="Out of TAT (open)" value={t.outOfTatOpen} tone="text-red-700" onClick={() => onDrill({ open: 'open', tat: ['Out of TAT'] })} />
        <Kpi label="Due in 2 days" value={t.dueSoon} tone="text-amber-700" onClick={() => onDrill({ tat: ['Due soon'] })} />
        <Kpi label="Insufficiency open" value={t.insuffOpen} hint={t.insuffAvgDays != null ? `avg ${t.insuffAvgDays} days open` : undefined} tone="text-amber-700" onClick={() => onDrill({ insuffOpen: true })} />
        <Kpi label="Reported in TAT" value={t.reportedInTatPct != null ? `${t.reportedInTatPct}%` : '—'} hint={`${t.reported} reported`} />
        <Kpi label="Avg turnaround" value={t.avgTatDays != null ? `${t.avgTatDays}d` : '—'} hint={t.avgOpenAging != null ? `open cases avg ${t.avgOpenAging}d old` : undefined} />
        {meta.showChecks
          ? <Kpi label="Red / Amber" value={t.discrepant} tone="text-red-700" onClick={() => onDrill({ discrepancy: true })} />
          : <Kpi label="Closed" value={t.closed} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Cases by status">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.byStatus} layout="vertical" margin={{ left: 30 }}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="status" width={110} tick={{ fontSize: 12 }} interval={0} />
              <Tooltip />
              <Bar dataKey="n" name="Cases" onClick={(d: any) => onDrill({ status: [d.status] })} cursor="pointer">
                {data.byStatus.map((s: any) => <Cell key={s.status} fill={STATUS_COLOURS[s.status] || '#94a3b8'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Open cases vs TAT">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.tat} dataKey="n" nameKey="tatStatus" innerRadius={55} outerRadius={90} paddingAngle={2} onClick={(d: any) => onDrill({ open: 'open', tat: [d.tatStatus] })} cursor="pointer">
                {data.tat.map((s: any) => <Cell key={s.tatStatus} fill={TAT_COLOURS[s.tatStatus] || '#94a3b8'} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Aging of open cases">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.aging}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="n" name="Open cases" fill="#5B8C3E" onClick={(d: any) => onDrill({ open: 'open', aging: d.key })} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly volume (initiation cycle)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.byMonth.map((m: any) => ({ ...m, label: fmtMonth(m.month) }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="initiated" name="Initiated" fill="#3b82f6" />
              <Bar dataKey="completed" name="Closed" fill="#22c55e" />
              <Bar dataKey="outOfTat" name="Out of TAT" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {meta.showChecks && checkRows.length > 0 && (
          <ChartCard title="Checks by status">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={checkRows} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} interval={0} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {usedCheckStatuses.map((s) => <Bar key={s} dataKey={s} stackId="a" fill={CHECK_COLOURS[s] || '#94a3b8'} />)}
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {!meta.isClient && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="By company" className="lg:col-span-2">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 border-b sticky top-0 bg-white">
                  <tr><th className="text-left py-1">Company</th><th className="text-right">Total</th><th className="text-right">Open</th><th className="text-right">Out of TAT</th><th className="text-right">Insuff open</th></tr>
                </thead>
                <tbody>
                  {data.byCompany.map((c: any) => (
                    <tr key={c.customerId} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => onDrill({ customerIds: [c.customerId] })}>
                      <td className="py-1.5">{c.companyName}</td>
                      <td className="text-right">{c.total}</td>
                      <td className="text-right">{c.open}</td>
                      <td className={`text-right ${c.outOfTat ? 'text-red-700 font-medium' : ''}`}>{c.outOfTat}</td>
                      <td className={`text-right ${c.insuff ? 'text-amber-700' : ''}`}>{c.insuff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          <ChartCard title="Open cases per person">
            <div className="space-y-3 text-sm max-h-80 overflow-y-auto">
              {[['Allocated to', data.byAllocated, 'allocatedTo'], ['Initiator', data.byInitiator, 'initiator']].map(([label, list, key]: any) => (
                <div key={label}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  {list.length === 0 && <p className="text-xs text-gray-400">—</p>}
                  {list.slice(0, 12).map((x: any) => (
                    <button type="button" key={x.name} className="w-full flex justify-between py-0.5 hover:text-brand-green" onClick={() => x.name !== '(not set)' && onDrill({ open: 'open', [key]: [x.name] })}>
                      <span className="truncate">{x.name}</span><span className="font-medium">{x.n}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {!meta.isClient && (
        <ChartCard title={`Billing — ${t.billingPending} pending, ${t.billed} billed`}>
          {data.billingByMonth.length === 0 ? <p className="text-sm text-gray-400">Nothing billed yet.</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.billingByMonth.map((m: any) => ({ ...m, label: fmtMonth(m.month) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="n" name="Cases billed" fill="#5B8C3E" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}
    </div>
  );
};

export default TrackerAnalytics;
