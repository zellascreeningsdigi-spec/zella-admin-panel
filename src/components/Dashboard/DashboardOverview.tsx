import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  MapPin
} from 'lucide-react';
import { apiService } from '@/services/api';

type CaseStats = {
  totalCases: number;
  pendingCases: number;
  completedCases: number;
  insufficiencyCases: number;
  digiLockerInitiated: number;
  digiLockerCompleted: number;
};

type AvStats = {
  total: number;
  pending: number;
  verified: number;
  failed: number;
  linkSent: number;
  expired: number;
  successRate: number;
};

type DcStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  linkSent: number;
  completed: number;
  successRate: number;
};

type ActivityItem = {
  type: 'case' | 'address' | 'document' | 'report';
  id: string;
  name: string;
  status: string;
  time: string;
};

const POSITIVE = new Set(['completed', 'verified', 'approved', 'submitted', 'reviewed']);
const PENDING = new Set(['pending', 'in-progress', 'in_progress', 'link_sent', 'not_initiated']);
const NEGATIVE = new Set(['failed', 'rejected', 'insufficiency', 'expired']);

const dotColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (POSITIVE.has(s)) return 'bg-green-500';
  if (PENDING.has(s)) return 'bg-yellow-500';
  if (NEGATIVE.has(s)) return 'bg-red-500';
  return 'bg-gray-400';
};

const TYPE_LABEL: Record<ActivityItem['type'], string> = {
  case: 'Case',
  address: 'Address verification',
  document: 'Document collection',
  report: 'Report'
};

const prettyStatus = (status: string) =>
  (status || '')
    .replace(/[_-]+/g, ' ')
    .replace(/^\s*([a-z])/, (_, c) => c.toUpperCase());

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
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk} wk${wk === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
};

const pct = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;

const DashboardOverview: React.FC = () => {
  const [caseStats, setCaseStats] = useState<CaseStats | null>(null);
  const [avStats, setAvStats] = useState<AvStats | null>(null);
  const [dcStats, setDcStats] = useState<DcStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      apiService.getCaseStats(),
      apiService.getAddressVerificationStats(),
      apiService.getDocumentCollectionStats(),
      apiService.getDashboardActivity(10)
    ])
      .then(([caseRes, avRes, dcRes, actRes]) => {
        if (cancelled) return;
        setCaseStats(caseRes.data?.stats || null);
        setAvStats(avRes.data?.stats || null);
        setDcStats(dcRes.data?.stats || null);
        setActivity(actRes.data?.activity || []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Dashboard load failed:', err);
        setError(err?.message || 'Could not reach the server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const tiles: Array<{ title: string; value: number; description: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [
    {
      title: 'Total Cases',
      value: caseStats?.totalCases ?? 0,
      description: 'All verification cases',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Completed',
      value: caseStats?.completedCases ?? 0,
      description: 'Successfully verified',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Pending',
      value: caseStats?.pendingCases ?? 0,
      description: 'Awaiting verification',
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'Insufficiency',
      value: caseStats?.insufficiencyCases ?? 0,
      description: 'Require additional info',
      icon: AlertCircle,
      color: 'text-red-600'
    },
    {
      title: 'Address Pending',
      value: (avStats?.pending ?? 0) + (avStats?.linkSent ?? 0),
      description: 'Awaiting candidate response',
      icon: MapPin,
      color: 'text-blue-600'
    },
    {
      title: 'Address Verified',
      value: avStats?.verified ?? 0,
      description: 'Successfully verified',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Documents Pending',
      value: (dcStats?.pending ?? 0) + (dcStats?.linkSent ?? 0),
      description: 'Awaiting candidate response',
      icon: FileSpreadsheet,
      color: 'text-blue-600'
    },
    {
      title: 'Documents Approved',
      value: dcStats?.approved ?? 0,
      description: 'Reviewed and approved',
      icon: CheckCircle,
      color: 'text-green-600'
    }
  ];

  const breakdownTotal = caseStats?.totalCases ?? 0;
  const breakdownRows = [
    { label: 'Completed', value: caseStats?.completedCases ?? 0, fill: 'bg-green-500' },
    { label: 'Pending', value: caseStats?.pendingCases ?? 0, fill: 'bg-yellow-500' },
    { label: 'Insufficiency', value: caseStats?.insufficiencyCases ?? 0, fill: 'bg-red-500' },
    { label: 'DigiLocker initiated', value: caseStats?.digiLockerInitiated ?? 0, fill: 'bg-blue-500' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">
          Monitor your verification cases and pipeline status
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          Could not load dashboard data. {error}
        </div>
      )}

      {loading && !error ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          Loading dashboard…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <Card key={tile.title}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{tile.title}</CardTitle>
                    <Icon className={`h-4 w-4 ${tile.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{tile.value}</div>
                    <p className="text-xs text-muted-foreground">{tile.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest verification requests and updates across all pipelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activity.length === 0 ? (
                  <div className="text-sm text-gray-500 py-6 text-center">
                    No recent activity yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activity.map((item) => (
                      <div key={`${item.type}-${item.id}`} className="flex items-center space-x-4">
                        <div className={`h-2 w-2 rounded-full ${dotColor(item.status)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {TYPE_LABEL[item.type]} — {prettyStatus(item.status)}
                          </p>
                        </div>
                        <div className="text-xs text-gray-400 shrink-0" title={new Date(item.time).toLocaleString()}>
                          {relativeTime(item.time)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Case Status Breakdown</CardTitle>
                <CardDescription>
                  Distribution of {breakdownTotal} case{breakdownTotal === 1 ? '' : 's'} across pipeline stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {breakdownRows.map((row) => {
                    const percent = pct(row.value, breakdownTotal);
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{row.label}</span>
                          <span className="text-sm text-gray-600">
                            {row.value} <span className="text-gray-400">({percent}%)</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded">
                          <div
                            className={`h-2 ${row.fill} rounded`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardOverview;
