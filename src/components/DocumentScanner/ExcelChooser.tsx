import React, { useEffect, useState } from 'react';
import { Plus, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import apiService from '@/services/api';

interface ExcelSummary {
  id: string;
  name: string;
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ExcelChooserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChosen: (excelId: string, excelName: string) => Promise<void>;
}

const ExcelChooser: React.FC<ExcelChooserProps> = ({ open, onOpenChange, onChosen }) => {
  const [excels, setExcels] = useState<ExcelSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSelectedId(null);
    setLoading(true);
    apiService.listScannerExcels()
      .then(res => {
        if (res.success && res.data) setExcels(res.data.excels);
      })
      .catch(err => setError(err?.message || 'Failed to load Excels'))
      .finally(() => setLoading(false));
  }, [open]);

  const handleAppend = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const target = excels.find(e => e.id === selectedId);
      await onChosen(selectedId, target?.name || 'Excel');
      onOpenChange(false);
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setError('Name is required');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await apiService.createScannerExcel(name);
      if (!res.success || !res.data) throw new Error(res.message || 'Create failed');
      await onChosen(res.data.id, res.data.name);
      onOpenChange(false);
      setNewName('');
    } catch (e: any) {
      setError(e?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save row to Excel</DialogTitle>
          <DialogDescription>
            Append this candidate to an existing Excel, or create a new one.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="append" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="append">Append to existing</TabsTrigger>
            <TabsTrigger value="new">Create new</TabsTrigger>
          </TabsList>

          <TabsContent value="append" className="space-y-3 pt-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : excels.length === 0 ? (
              <div className="text-sm text-gray-500 py-4">No Excels yet. Switch to “Create new”.</div>
            ) : (
              <div className="max-h-72 overflow-auto border rounded">
                {excels.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full text-left flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 ${
                      selectedId === e.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <FileSpreadsheet className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{e.name}</div>
                      <div className="text-xs text-gray-500">
                        {e.rowCount} {e.rowCount === 1 ? 'row' : 'rows'} · updated {new Date(e.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleAppend} disabled={!selectedId || busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Append row
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="new" className="space-y-3 pt-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Excel name</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Enermech-Batch-Nov2025"
                disabled={creating}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">A new .xlsx file will be created with this candidate as the first row.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Create & save
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExcelChooser;
