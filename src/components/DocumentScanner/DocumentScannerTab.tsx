import React, { useCallback, useState } from 'react';
import { CheckCircle2, ScanLine } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import apiService from '@/services/api';
import UploadDropzone from './UploadDropzone';
import ScanProgress, { ScanJobSnapshot } from './ScanProgress';
import ReviewForm, { ReviewedCandidate } from './ReviewForm';
import ExcelChooser from './ExcelChooser';
import ExcelLibrary from './ExcelLibrary';

type Stage = 'upload' | 'scanning' | 'review' | 'done';

interface SavedSummary {
  excelName: string;
  rowCount: number;
  appended: number;
  attempted: number;
  errors: number;
}

const DocumentScannerTab: React.FC = () => {
  const [stage, setStage] = useState<Stage>('upload');
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [completedJob, setCompletedJob] = useState<ScanJobSnapshot | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null);
  const [pendingCandidates, setPendingCandidates] = useState<ReviewedCandidate[] | null>(null);

  const handleSubmit = async (
    files: File[],
    docTypes: string[],
    candidateIndices: number[],
    provider: 'openai' | 'hybrid'
  ) => {
    setSubmitting(true);
    setScanError(null);
    try {
      const res = await apiService.scanDocuments(files, docTypes, candidateIndices, provider);
      if (!res.success || !res.data?.jobId) {
        throw new Error(res.message || 'Failed to start scan');
      }
      setJobId(res.data.jobId);
      setStage('scanning');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = useCallback((job: ScanJobSnapshot) => {
    setCompletedJob(job);
    setStage('review');
  }, []);

  const handleFailed = useCallback((err: string) => {
    setScanError(err);
    setStage('upload');
    setJobId(null);
  }, []);

  const handleReviewCommit = (candidates: ReviewedCandidate[]) => {
    setPendingCandidates(candidates);
    setChooserOpen(true);
  };

  const handleExcelChosen = async (excelId: string, excelName: string) => {
    if (!pendingCandidates || pendingCandidates.length === 0) return;
    setCommitting(true);
    try {
      const res = await apiService.appendScannerRowsBulk(excelId, {
        candidates: pendingCandidates,
        sourceJobId: jobId || undefined
      });
      if (!res.success || !res.data) throw new Error(res.message || 'Save failed');
      setSavedSummary({
        excelName,
        rowCount: res.data.excel?.rowCount ?? 0,
        appended: res.data.appended,
        attempted: pendingCandidates.length,
        errors: res.data.errors?.length ?? 0
      });
      setStage('done');
      setPendingCandidates(null);
    } finally {
      setCommitting(false);
    }
  };

  const resetForNext = () => {
    setStage('upload');
    setJobId(null);
    setCompletedJob(null);
    setSavedSummary(null);
    setScanError(null);
    setPendingCandidates(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          <ScanLine className="h-6 w-6 text-blue-700" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Document Scanner</h1>
          <p className="text-sm text-gray-500">
            Upload candidate documents, let OpenAI extract the fields, review all candidates, then save to an Excel in one go.
          </p>
        </div>
      </div>

      <Tabs defaultValue="scan" className="w-full">
        <TabsList>
          <TabsTrigger value="scan">New Scan</TabsTrigger>
          <TabsTrigger value="library">Excel Library</TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="pt-4">
          {stage === 'upload' && (
            <div className="space-y-4">
              {scanError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                  Last scan failed: {scanError}
                </div>
              )}
              <UploadDropzone onSubmit={handleSubmit} submitting={submitting} />
            </div>
          )}

          {stage === 'scanning' && jobId && (
            <ScanProgress jobId={jobId} onComplete={handleComplete} onFailed={handleFailed} />
          )}

          {stage === 'review' && completedJob && (
            <ReviewForm
              job={completedJob}
              onCommit={handleReviewCommit}
              committing={committing}
            />
          )}

          {stage === 'done' && savedSummary && (
            <div className="text-center py-12 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">
                  Saved {savedSummary.appended} of {savedSummary.attempted} to “{savedSummary.excelName}”
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  The Excel now has {savedSummary.rowCount} {savedSummary.rowCount === 1 ? 'row' : 'rows'}.
                  {savedSummary.errors > 0 && (
                    <span className="text-red-600"> {savedSummary.errors} row(s) failed to write.</span>
                  )}
                </p>
              </div>
              <Button onClick={resetForNext}>Scan more candidates</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="pt-4">
          <ExcelLibrary />
        </TabsContent>
      </Tabs>

      <ExcelChooser
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onChosen={handleExcelChosen}
      />
    </div>
  );
};

export default DocumentScannerTab;
