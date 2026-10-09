import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { TemplateField } from '@/lib/bgvForm/types';

// One field of the candidate form, rendered from its template definition.
// Styling matches the original hardcoded form so candidates see no change.

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface FileUploadState {
  status: UploadStatus;
  fileName?: string;
  error?: string;
  onSelect: (file: File | null) => void;
}

interface FieldInputProps {
  field: TemplateField;
  /** Unique DOM id (fields inside repeaters need the row index). */
  domId: string;
  value: any;
  onChange: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  /** Present for file fields. */
  upload?: FileUploadState;
  /** Smaller labels inside repeater rows. */
  compact?: boolean;
  disabled?: boolean;
}

const selectClass = (error?: string) =>
  `mt-1 w-full px-3 py-2 border rounded-md bg-white ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300'}`;

// Date/month inputs normally open the calendar only from the small icon,
// which is an easy target to miss on a phone. showPicker() opens it from a
// tap anywhere in the box. It is not supported everywhere and throws if the
// input is not user-activated, so it is guarded and failure is harmless.
const openPicker = (el: HTMLInputElement | null) => {
  if (!el) return;
  try {
    (el as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
  } catch {
    /* unsupported or blocked — the native icon remains available */
  }
};

export const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {message}
    </p>
  ) : null;

const RequiredMark: React.FC<{ field: TemplateField }> = ({ field }) =>
  (field.required || field.displayRequired) && !field.hideRequiredMark ? <span className="text-red-500">*</span> : null;

const FieldInput: React.FC<FieldInputProps> = ({
  field, domId, value, onChange, onBlur, error, upload, compact, disabled,
}) => {
  const labelClass = compact ? 'text-sm' : 'text-gray-700 font-medium';
  const help = field.helpText ? <p className="text-xs text-gray-500 mt-0.5">{field.helpText}</p> : null;

  if (field.type === 'info') {
    return (
      <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 whitespace-pre-line">
        {field.label}
      </div>
    );
  }

  if (field.type === 'consent' || field.type === 'checkbox') {
    return (
      <div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            id={domId}
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(e) => { onChange(e.target.checked); onBlur?.(); }}
            className="mt-1 h-5 w-5 shrink-0"
          />
          <span className="text-sm text-gray-700">
            {field.label} {field.type === 'checkbox' && <RequiredMark field={field} />}
          </span>
        </label>
        {help}
        <FieldError message={error} />
      </div>
    );
  }

  const label = (
    <Label htmlFor={domId} className={labelClass}>
      {field.label} <RequiredMark field={field} />
    </Label>
  );

  if (field.type === 'file') {
    const status = upload?.status || 'idle';
    return (
      <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
        status === 'success' ? 'border-green-400 bg-green-50' :
        status === 'error' ? 'border-red-400 bg-red-50' :
        status === 'uploading' ? 'border-yellow-400 bg-yellow-50' :
        'border-gray-300 hover:border-brand-green'
      }`}>
        {label}
        {help}
        <input
          type="file"
          id={domId}
          accept=".pdf,.jpg,.jpeg,.png"
          disabled={disabled || status === 'uploading'}
          onChange={(e) => upload?.onSelect(e.target.files?.[0] || null)}
          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100 disabled:opacity-50"
        />
        {status === 'uploading' && (
          <p className="text-xs text-yellow-700 font-medium mt-2 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
          </p>
        )}
        {status === 'success' && upload?.fileName && (
          <p className="text-xs text-green-700 font-medium mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {upload.fileName}
          </p>
        )}
        {status === 'error' && upload?.error && (
          <p className="text-xs text-red-600 font-medium mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {upload.error}
          </p>
        )}
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === 'dropdown') {
    return (
      <div>
        {label}
        {help}
        <select
          id={domId}
          className={selectClass(error)}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
        >
          <option value="">Select</option>
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        {label}
        {help}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2" role="radiogroup" aria-labelledby={domId}>
          {(field.options || []).map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name={domId}
                value={o.value}
                checked={String(value ?? '') === o.value}
                disabled={disabled}
                onChange={() => { onChange(o.value); onBlur?.(); }}
                className="h-4 w-4"
              />
              {o.label}
            </label>
          ))}
        </div>
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === 'multiselect') {
    const selected: string[] = Array.isArray(value) ? value : [];
    const toggle = (v: string) =>
      onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
    return (
      <div>
        {label}
        {help}
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(field.options || []).map((o) => (
            <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                disabled={disabled}
                onChange={() => { toggle(o.value); onBlur?.(); }}
                className="h-4 w-4"
              />
              {o.label}
            </label>
          ))}
        </div>
        <FieldError message={error} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        {help}
        <textarea
          id={domId}
          value={value ?? ''}
          rows={4}
          disabled={disabled}
          placeholder={field.placeholder || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          className={`mt-1 w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
        <FieldError message={error} />
      </div>
    );
  }

  const inputType = field.type === 'phone' ? 'tel'
    : field.type === 'number' ? 'number'
    : field.type === 'email' ? 'email'
    : field.type === 'date' ? 'date'
    : field.type === 'month' ? 'month'
    : 'text';
  const isPicker = inputType === 'date' || inputType === 'month';

  return (
    <div>
      {label}
      {help}
      <Input
        id={domId}
        type={inputType}
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onClick={isPicker ? (e) => openPicker(e.currentTarget) : undefined}
        onFocus={isPicker ? (e) => openPicker(e.currentTarget) : undefined}
        placeholder={field.placeholder || ''}
        aria-invalid={error ? true : undefined}
        className={`mt-1 ${isPicker ? 'cursor-pointer' : ''} ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
      />
      <FieldError message={error} />
    </div>
  );
};

export default FieldInput;
