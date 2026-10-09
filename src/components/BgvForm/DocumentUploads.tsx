import React from 'react';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { TemplateDocument } from '@/lib/bgvForm/types';
import type { UploadStatus } from './FieldInput';

// The document-upload step, driven by the template's document list.
// Documents upload as soon as they are picked; status is keyed by the storage
// key (documents.<key> / customDocuments.<key>) so a reload restores it from
// what the server already holds.

export interface DocumentSlot {
  /** Storage key, also the status key. */
  key: string;
  /** docType the upload endpoint expects. */
  uploadKey: string;
  label: string;
  required: boolean;
  helpText?: string;
}

export interface EmploymentDocGroup {
  index: number;
  label: string;
  helpText: string;
  required: boolean;
  subDocs: { key: string; label: string }[];
}

/** Flat slots for the visible documents (per-employment cards excluded). */
export const documentSlots = (docs: TemplateDocument[]): DocumentSlot[] =>
  docs
    .filter((d) => d.type !== 'perEmployment')
    .map((d) => ({
      key: d.key || d.id,
      uploadKey: d.uploadKey || d.key || d.id,
      label: d.label,
      required: d.required !== false,
      helpText: d.helpText,
    }));

/** One card per employment entry, when the template has the proofs card. */
export const employmentDocGroups = (
  docs: TemplateDocument[],
  employments: { companyName?: string }[]
): EmploymentDocGroup[] => {
  const card = docs.find((d) => d.type === 'perEmployment');
  if (!card) return [];
  const subDocs = (card.subDocs || []).filter((s) => !s.hidden);
  if (subDocs.length === 0) return [];
  return employments.map((emp, i) => ({
    index: i,
    label: emp.companyName || `Employment ${i + 1}`,
    helpText: card.helpText || `Upload at least one: ${subDocs.map((s) => s.label).join(', ')}`,
    required: card.required !== false,
    subDocs: subDocs.map((s) => ({ key: `${s.key}_emp_${i}`, label: s.label })),
  }));
};

interface DocumentUploadsProps {
  slots: DocumentSlot[];
  groups: EmploymentDocGroup[];
  uploadStatus: Record<string, UploadStatus>;
  uploadErrors: Record<string, string>;
  fileNames: Record<string, string | undefined>;
  onSelect: (key: string, uploadKey: string, file: File | null) => void;
  helpText?: string;
}

const statusBorder = (status: UploadStatus) =>
  status === 'success' ? 'border-green-400 bg-green-50' :
  status === 'error' ? 'border-red-400 bg-red-50' :
  status === 'uploading' ? 'border-yellow-400 bg-yellow-50' :
  'border-gray-300 hover:border-brand-green';

const StatusLine: React.FC<{ status: UploadStatus; name?: string; error?: string }> = ({ status, name, error }) => (
  <>
    {status === 'uploading' && (
      <p className="text-xs text-yellow-700 font-medium mt-2 flex items-center gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
      </p>
    )}
    {status === 'success' && name && (
      <p className="text-xs text-green-700 font-medium mt-2 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" /> {name}
      </p>
    )}
    {status === 'error' && error && (
      <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {error}
      </p>
    )}
  </>
);

const DocumentUploads: React.FC<DocumentUploadsProps> = ({
  slots, groups, uploadStatus, uploadErrors, fileNames, onSelect, helpText,
}) => (
  <div className="space-y-6">
    <p className="text-sm text-gray-600">
      {helpText || 'Upload all documents (max 5MB each, PDF/JPG/PNG). Documents are uploaded immediately when selected.'}
    </p>

    {slots.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {slots.map(({ key, uploadKey, label, required, helpText: help }) => {
          const status = uploadStatus[key] || 'idle';
          return (
            <div key={key} className={`border-2 border-dashed rounded-lg p-4 transition-colors ${statusBorder(status)}`}>
              <Label htmlFor={`doc-${key}`} className="text-gray-700 font-medium">
                {label} {required && <span className="text-red-500">*</span>}
              </Label>
              {help && <p className="text-xs text-gray-500 mt-0.5">{help}</p>}
              <input
                type="file"
                id={`doc-${key}`}
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={status === 'uploading'}
                onChange={(e) => onSelect(key, uploadKey, e.target.files?.[0] || null)}
                className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100 disabled:opacity-50"
              />
              <StatusLine status={status} name={fileNames[key]} error={uploadErrors[key]} />
            </div>
          );
        })}
      </div>
    )}

    {groups.length > 0 && (
      <div className="space-y-4">
        {groups.map((group) => {
          const anySuccess = group.subDocs.some((sd) => uploadStatus[sd.key] === 'success');
          const anyError = group.subDocs.some((sd) => uploadStatus[sd.key] === 'error');
          const anyUploading = group.subDocs.some((sd) => uploadStatus[sd.key] === 'uploading');
          return (
            <div key={group.index} className={`border-2 rounded-lg p-4 transition-colors ${
              anySuccess ? 'border-green-400 bg-green-50' :
              anyError ? 'border-red-400 bg-red-50' :
              anyUploading ? 'border-yellow-400 bg-yellow-50' :
              'border-gray-300'
            }`}>
              <Label className="text-gray-800 font-semibold text-base">
                {group.label} — Documents {group.required && <span className="text-red-500">*</span>}
              </Label>
              <p className="text-xs text-gray-500 mt-1 mb-3">{group.helpText}</p>
              <div className="space-y-3">
                {group.subDocs.map((sd) => {
                  const status = uploadStatus[sd.key] || 'idle';
                  return (
                    <div key={sd.key}>
                      <Label htmlFor={`doc-${sd.key}`} className="text-gray-600 text-sm">{sd.label}</Label>
                      <input
                        type="file"
                        id={`doc-${sd.key}`}
                        accept=".pdf,.jpg,.jpeg,.png"
                        disabled={status === 'uploading'}
                        onChange={(e) => onSelect(sd.key, sd.key, e.target.files?.[0] || null)}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100 disabled:opacity-50"
                      />
                      <StatusLine status={status} name={fileNames[sd.key]} error={uploadErrors[sd.key]} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default DocumentUploads;
