import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import apiService from '@/services/api';
import { docTypeLabel } from './fields';

export interface ScanJobSnapshot {
  jobId: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  progress: { total: number; done: number; failed: number; phase: string };
  docs: Array<{ docType: string; originalName: string; mime: string; pageCount: number; candidateIndex?: number; quality?: { score: number; warnings: string[] } | null; error: string | null }>;
  result?: {
    fields: Record<string, string | null> | null;
    provenance: Record<string, string | null> | null;
    warnings: string[];
    candidates?: Array<{
      index: number;
      fields: Record<string, string | null> | null;
      provenance: Record<string, string | null> | null;
      error: string | null;
      tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }>;
  };
  tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  error?: string | null;
  docUrls?: Array<{ docType: string; originalName: string; mime: string; url: string; candidateIndex?: number; quality?: { score: number; warnings: string[] } | null }>;
}

interface ScanProgressProps {
  jobId: string;
  onComplete: (job: ScanJobSnapshot) => void;
  onFailed: (error: string) => void;
}

const POLL_INTERVAL_MS = 2500;

const ScanProgress: React.FC<ScanProgressProps> = ({ jobId, onComplete, onFailed }) => {
  const [job, setJob] = useState<ScanJobSnapshot | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let timer: number | undefined;

    const poll = async () => {
      if (stoppedRef.current) return;
      try {
        const res = await apiService.getScanJob(jobId);
        if (stoppedRef.current) return;
        if (!res.success || !res.data) throw new Error(res.message || 'No data');
        setJob(res.data);
        setPollError(null);

        if (res.data.status === 'done') {
          stoppedRef.current = true;
          onComplete(res.data);
          return;
        }
        if (res.data.status === 'failed') {
          stoppedRef.current = true;
          onFailed(res.data.error || 'Scan failed');
          return;
        }
      } catch (err: any) {
        if (stoppedRef.current) return;
        setPollError(err?.message || 'Polling error');
      }
      timer = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      stoppedRef.current = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [jobId, onComplete, onFailed]);

  if (!job) {
    return (
      <div className="flex items-center gap-2 text-gray-600 text-sm py-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Submitting scan…
      </div>
    );
  }

  const total = job.progress?.total || job.docs.length || 1;
  const done = job.progress?.done || 0;
  const failed = job.progress?.failed || 0;
  const completed = Math.min(done + failed, total);
  const pct = Math.round((completed / total) * 100);
  const phaseLabel = {
    queued: 'Queued',
    preparing: 'Preparing images',
    extracting: 'Calling OpenAI Vision',
    done: 'Done',
    failed: 'Failed'
  }[job.progress?.phase || job.status] || job.status;

  return (
    <div className="space-y-4 py-4">
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">{phaseLabel}</span>
          <span className="text-gray-500">{completed} / {total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="border rounded-lg divide-y">
        {job.docs.map((d, i) => {
          const status =
            d.error ? 'failed'
            : (i < done ? 'done'
            : (job.status === 'running' && i === done ? 'running' : 'queued'));
          const Icon =
            status === 'done' ? CheckCircle2
            : status === 'failed' ? XCircle
            : status === 'running' ? Loader2
            : Loader2;
          const color =
            status === 'done' ? 'text-green-600'
            : status === 'failed' ? 'text-red-600'
            : status === 'running' ? 'text-blue-600'
            : 'text-gray-400';
          return (
            <div key={i} className="flex items-center gap-3 p-3 text-sm">
              <Icon className={`h-4 w-4 ${color} ${status === 'running' || status === 'queued' ? 'animate-spin' : ''}`} />
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{d.originalName}</div>
                <div className="text-xs text-gray-500">{docTypeLabel(d.docType)}</div>
                {d.error && (
                  <div className="text-xs text-red-600 mt-0.5">{d.error}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {job.result?.warnings && job.result.warnings.length > 0 && (
        <div className="flex items-start gap-2 text-sm bg-yellow-50 border border-yellow-200 rounded p-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>{job.result.warnings.join('; ')}</div>
        </div>
      )}

      {pollError && (
        <div className="text-xs text-gray-500">Connection hiccup: {pollError} (retrying…)</div>
      )}
    </div>
  );
};

export default ScanProgress;
