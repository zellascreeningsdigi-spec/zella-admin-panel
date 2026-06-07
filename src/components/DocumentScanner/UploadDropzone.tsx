import React, { useCallback, useMemo, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image as ImageIcon, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DOC_TYPES } from './fields';

interface PendingFile {
  file: File;
  docType: string;
  /** 0-indexed; each file defaults to its own candidate. Admin can change via the dropdown. */
  candidateIndex: number;
}

interface UploadDropzoneProps {
  onSubmit: (files: File[], docTypes: string[], candidateIndices: number[]) => Promise<void>;
  submitting: boolean;
}

const UploadDropzone: React.FC<UploadDropzoneProps> = ({ onSubmit, submitting }) => {
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    setError(null);
    setPending(prev => {
      // Each newly-dropped file gets its own candidate slot by default —
      // matches the user rule: "if not grouped, treat each as a different candidate".
      const nextIdx = prev.length === 0 ? 0 : Math.max(...prev.map(p => p.candidateIndex)) + 1;
      const additions = accepted.map<PendingFile>((f, i) => ({
        file: f,
        docType: guessDocType(f.name),
        candidateIndex: nextIdx + i
      }));
      const merged = [...prev, ...additions];
      if (merged.length > 10) {
        setError('Maximum 10 files per scan.');
        return merged.slice(0, 10);
      }
      return merged;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 5 * 1024 * 1024,
    maxFiles: 10,
    onDropRejected: (rejections) => {
      const reason = rejections[0]?.errors[0]?.message || 'File rejected';
      setError(reason);
    }
  });

  const updateDocType = (idx: number, docType: string) => {
    setPending(prev => prev.map((p, i) => (i === idx ? { ...p, docType } : p)));
  };

  const updateCandidate = (idx: number, candidateIndex: number) => {
    setPending(prev => prev.map((p, i) => (i === idx ? { ...p, candidateIndex } : p)));
  };

  const removeFile = (idx: number) => {
    setPending(prev => prev.filter((_, i) => i !== idx));
  };

  // Renumber candidates densely (0, 1, 2 …) on submit so the backend doesn't
  // see gaps if the admin removed files. Display still uses the raw values
  // until submit so labels stay stable while editing.
  const denseIndices = useMemo(() => {
    const uniques = Array.from(new Set(pending.map(p => p.candidateIndex))).sort((a, b) => a - b);
    const remap = new Map(uniques.map((v, i) => [v, i]));
    return pending.map(p => remap.get(p.candidateIndex) ?? 0);
  }, [pending]);

  const candidateCount = useMemo(
    () => new Set(pending.map(p => p.candidateIndex)).size,
    [pending]
  );

  // Sorted set of currently-used candidate slots, plus one "new candidate" slot
  // for the per-row dropdown to offer.
  const candidateSlots = useMemo(() => {
    const uniques = Array.from(new Set(pending.map(p => p.candidateIndex))).sort((a, b) => a - b);
    const nextSlot = uniques.length === 0 ? 0 : uniques[uniques.length - 1] + 1;
    return { existing: uniques, nextSlot };
  }, [pending]);

  const handleSubmit = async () => {
    setError(null);
    const untagged = pending.find(p => !p.docType);
    if (untagged) {
      setError(`Pick a type for "${untagged.file.name}".`);
      return;
    }
    if (pending.length === 0) {
      setError('Add at least one file.');
      return;
    }
    try {
      await onSubmit(
        pending.map(p => p.file),
        pending.map(p => p.docType),
        denseIndices
      );
      setPending([]);
    } catch (e: any) {
      setError(e?.message || 'Submit failed');
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive ? 'Drop the files here…' : 'Drag & drop documents here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-500">PDF / JPG / PNG · up to 5MB each · max 10 files</p>
      </div>

      {pending.length > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-gray-600 px-1">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {candidateCount} candidate{candidateCount === 1 ? '' : 's'} · {pending.length} file{pending.length === 1 ? '' : 's'}
            </div>
            <div className="text-gray-500">
              Group files under the same candidate to scan them together.
            </div>
          </div>
          <div className="border rounded-lg divide-y">
            {pending.map((p, idx) => {
              const Icon = p.file.type.includes('pdf') ? FileText : ImageIcon;
              return (
                <div key={idx} className="flex items-center gap-3 p-3">
                  <Icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.file.name}</div>
                    <div className="text-xs text-gray-500">{(p.file.size / 1024).toFixed(0)} KB</div>
                  </div>
                  <select
                    value={p.candidateIndex}
                    onChange={(e) => updateCandidate(idx, parseInt(e.target.value, 10))}
                    className="text-sm border rounded px-2 py-1 bg-white"
                    disabled={submitting}
                    title="Candidate this file belongs to"
                  >
                    {candidateSlots.existing.map((slot) => (
                      <option key={slot} value={slot}>Candidate {slot + 1}</option>
                    ))}
                    {/* "New" slot is only meaningful if it's different from the current selection */}
                    {!candidateSlots.existing.includes(candidateSlots.nextSlot) && (
                      <option value={candidateSlots.nextSlot}>+ New candidate</option>
                    )}
                  </select>
                  <select
                    value={p.docType}
                    onChange={(e) => updateDocType(idx, e.target.value)}
                    className="text-sm border rounded px-2 py-1 bg-white"
                    disabled={submitting}
                  >
                    <option value="">Select type…</option>
                    {DOC_TYPES.map(dt => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeFile(idx)}
                    className="text-gray-400 hover:text-red-600 p-1"
                    disabled={submitting}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={submitting || pending.length === 0}
        >
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Start Scan ({candidateCount} candidate{candidateCount === 1 ? '' : 's'})
        </Button>
      </div>
    </div>
  );
};

// Heuristic: guess a docType from the filename so the admin clicks less.
function guessDocType(name: string): string {
  const n = name.toLowerCase();
  if (/(aadhaa?r|adhar)/.test(n)) return 'aadhaar';
  if (/pan/.test(n) && /card/.test(n)) return 'pan';
  if (/pan/.test(n)) return 'pan';
  if (/passport/.test(n)) return 'passport';
  if (/hsc|12th|higher.?secondary/.test(n)) return 'marksheet_12th';
  if (/ssc|10th/.test(n)) return 'marksheet_10th';
  if (/diploma/.test(n)) return 'diploma';
  if (/mba|degree|graduation|bsc|bcom|btech|be\b|ma\b/.test(n)) return 'degree';
  if (/experience|relieving|service/.test(n)) return 'experience_letter';
  if (/offer|appointment/.test(n)) return 'offer_letter';
  if (/application|bgv|background|verification|form/.test(n)) return 'bgv_form';
  return '';
}

export default UploadDropzone;
