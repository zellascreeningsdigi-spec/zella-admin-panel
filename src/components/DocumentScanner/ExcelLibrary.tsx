import React, { useEffect, useState } from 'react';
import { Download, FileSpreadsheet, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import apiService from '@/services/api';

interface ExcelSummary {
  id: string;
  name: string;
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

const ExcelLibrary: React.FC = () => {
  const [excels, setExcels] = useState<ExcelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.listScannerExcels();
      if (res.success && res.data) setExcels(res.data.excels);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Excels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); }, []);

  const handleDownload = async (e: ExcelSummary) => {
    setDownloadingId(e.id);
    try {
      await apiService.downloadScannerExcel(e.id, e.name);
    } catch (err: any) {
      setError(err?.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Saved Excels</h2>
        <Button variant="outline" size="sm" onClick={fetchList} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}

      {loading && excels.length === 0 ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : excels.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm border border-dashed rounded-lg">
          No Excels yet. Run a scan and choose “Create new” to start your first one.
        </div>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {excels.map(e => (
            <div key={e.id} className="flex items-center gap-3 p-3">
              <FileSpreadsheet className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{e.name}</div>
                <div className="text-xs text-gray-500">
                  {e.rowCount} {e.rowCount === 1 ? 'row' : 'rows'} · created {new Date(e.createdAt).toLocaleDateString()} · updated {new Date(e.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(e)}
                disabled={downloadingId === e.id}
              >
                {downloadingId === e.id
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Download className="h-4 w-4 mr-2" />}
                Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExcelLibrary;
