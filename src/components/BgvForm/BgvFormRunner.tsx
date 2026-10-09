import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Stepper, Step } from '@/components/ui/stepper';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import StepFields from './StepFields';
import DocumentUploads, { documentSlots, employmentDocGroups } from './DocumentUploads';
import type { FileUploadState, UploadStatus } from './FieldInput';
import {
  FormTemplate,
  TemplateField,
  clone,
  documentsVisible,
  getPath,
  isFieldShown,
  rootFieldList,
  setPath,
  stepIdForErrorPath,
  validateAgainstTemplate,
  visibleSteps,
} from '@/lib/bgvForm/types';
import { FormValues, buildGapEntries, initialFormValues, mergeGapEntries } from '@/lib/bgvForm/formState';

// Steps, navigation, validation, uploads and submit for a template-driven BGV
// form. The candidate page and the form builder's preview both render this,
// so the preview is the real form.

// The candidate page also enforces browser-only requirements (the standard
// authorization ticks), as the original form did.
const CLIENT = { includeClientOnly: true };

export interface SubmitResult {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  message?: string;
}

interface BgvFormRunnerProps {
  template: FormTemplate;
  initialValues: FormValues;
  /** Storage key -> file name already on the server. */
  initialUploads?: Record<string, string>;
  /** Step id to resume on. */
  initialStepId?: string | null;
  onStepChange?: (stepId: string) => void;
  onSaveProgress: (formData: FormValues) => Promise<void>;
  onUpload: (uploadKey: string, file: File) => Promise<void>;
  onSubmit: (formData: FormValues) => Promise<SubmitResult>;
  submitLabel?: string;
}

const BgvFormRunner: React.FC<BgvFormRunnerProps> = ({
  template, initialValues, initialUploads = {}, initialStepId, onStepChange,
  onSaveProgress, onUpload, onSubmit, submitLabel = 'Submit BGV Form',
}) => {
  const steps = useMemo(() => visibleSteps(template), [template]);
  const rootFields = useMemo(() => rootFieldList(template), [template]);

  const [values, setValues] = useState<FormValues>(initialValues);
  const [stepIndex, setStepIndex] = useState(() => {
    const i = steps.findIndex((s) => s.id === initialStepId);
    return i > 0 ? i : 0;
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // field path -> message. Populated on a failed Next/Submit or on blur, so a
  // candidate is not shown errors for fields they have not reached yet.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  // Step titles that currently hold errors, so a candidate on the final step
  // can see which earlier step needs attention instead of a blank page.
  const [errorSummary, setErrorSummary] = useState<string[]>([]);

  const [uploadStatus, setUploadStatus] = useState<Record<string, UploadStatus>>(
    () => Object.fromEntries(Object.keys(initialUploads).map((k) => [k, 'success' as const]))
  );
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string | undefined>>({ ...initialUploads });
  // Guards against a slow earlier upload finishing after a newer pick.
  const uploadSeq = useRef<Record<string, number>>({});

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const isLast = stepIndex >= steps.length - 1;

  useEffect(() => {
    if (step) onStepChange?.(step.id);
  }, [step, onStepChange]);

  const setValue = useCallback((path: string, value: any) => {
    setValues((prev) => {
      const next = clone(prev);
      setPath(next, path, value);
      return next;
    });
  }, []);

  // Gap rows follow the employment list (count and company names).
  const gapField = useMemo(() => rootFields.find((f) => f.widget === 'gapDetails') || null, [rootFields]);
  const employments: FormValues[] = useMemo(
    () => (Array.isArray(values.employmentHistory) ? values.employmentHistory : []),
    [values.employmentHistory]
  );
  const employmentKeyOf = (list: FormValues[]) => `${list.length}|${list.map((e) => e?.companyName || '').join('|')}`;
  const employmentKey = employmentKeyOf(employments);
  // The original form rebuilt gap rows only when the employment list differed
  // from the blank form it started with, so saved gap answers survive a reload
  // until employment actually changes. Start from that same key.
  const lastEmploymentKey = useRef(employmentKeyOf(
    (initialFormValues(template).employmentHistory as FormValues[] | undefined) || []
  ));
  useEffect(() => {
    if (!gapField) return;
    if (employmentKey === lastEmploymentKey.current) return;
    lastEmploymentKey.current = employmentKey;
    setValues((prev) => {
      const next = clone(prev);
      const fresh = buildGapEntries(Array.isArray(prev.employmentHistory) ? prev.employmentHistory : []);
      setPath(next, gapField.path, mergeGapEntries(fresh, getPath(prev, gapField.path) || []));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employmentKey, gapField]);

  // ---- documents ----------------------------------------------------------
  const visibleDocs = useMemo(() => documentsVisible(template), [template]);
  const slots = useMemo(() => documentSlots(visibleDocs), [visibleDocs]);
  const groups = useMemo(() => employmentDocGroups(visibleDocs, employments), [visibleDocs, employments]);

  const fileFieldsIn = useCallback((stepId?: string): TemplateField[] =>
    steps.filter((s) => !stepId || s.id === stepId)
      .flatMap((s) => s.fields || [])
      .filter((f) => f.type === 'file' && isFieldShown(f, values, rootFields, values, rootFields)),
  [steps, values, rootFields]);

  const handleFile = async (key: string, uploadKey: string, file: File | null) => {
    if (!file) {
      setUploadStatus((p) => ({ ...p, [key]: 'idle' }));
      setUploadErrors((p) => { const n = { ...p }; delete n[key]; return n; });
      return;
    }
    const seq = (uploadSeq.current[key] || 0) + 1;
    uploadSeq.current[key] = seq;
    setUploadStatus((p) => ({ ...p, [key]: 'uploading' }));
    setUploadErrors((p) => { const n = { ...p }; delete n[key]; return n; });
    setFieldErrors((p) => { const n = { ...p }; delete n[key]; return n; });
    try {
      await onUpload(uploadKey, file);
      if (uploadSeq.current[key] !== seq) return;
      setUploadStatus((p) => ({ ...p, [key]: 'success' }));
      setFileNames((p) => ({ ...p, [key]: file.name }));
    } catch (err: any) {
      if (uploadSeq.current[key] !== seq) return;
      setUploadStatus((p) => ({ ...p, [key]: 'error' }));
      setUploadErrors((p) => ({ ...p, [key]: err?.message || 'Upload failed' }));
    }
  };

  const uploadFor = (field: TemplateField): FileUploadState => ({
    status: uploadStatus[field.id] || 'idle',
    fileName: fileNames[field.id],
    error: uploadErrors[field.id],
    onSelect: (file) => handleFile(field.id, field.id, file),
  });

  // ---- validation ---------------------------------------------------------
  /** Data errors plus required file uploads that are missing. */
  const collectErrors = useCallback((stepId?: string): Record<string, string> => {
    const all = validateAgainstTemplate(values, template, CLIENT);
    const errors = stepId
      ? Object.fromEntries(Object.entries(all).filter(([p]) => stepIdForErrorPath(template, p) === stepId))
      : all;
    for (const f of fileFieldsIn(stepId)) {
      if (f.required && uploadStatus[f.id] !== 'success') errors[f.path] = 'Please upload this file';
    }
    return errors;
  }, [values, template, fileFieldsIn, uploadStatus]);

  /**
   * Surface a validation failure so the candidate can actually act on it:
   * jump to the first offending step and list every affected step by name.
   */
  const showValidationErrors = (errors: Record<string, string>) => {
    setFieldErrors(errors);
    setTouched((prev) => ({ ...prev, ...Object.fromEntries(Object.keys(errors).map((k) => [k, true])) }));
    const affectedIds = new Set(Object.keys(errors).map((p) => stepIdForErrorPath(template, p)).filter(Boolean));
    const affected = steps.filter((s) => affectedIds.has(s.id));
    setErrorSummary(affected.map((s) => s.title));
    if (affected.length > 0) setStepIndex(steps.indexOf(affected[0]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Re-run validation for one field once it has been blurred. */
  const revalidateField = (path: string) => {
    setTouched((prev) => ({ ...prev, [path]: true }));
    const all = validateAgainstTemplate(values, template, CLIENT);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (all[path]) next[path] = all[path];
      else delete next[path];
      return next;
    });
  };

  // Required consents gate Next with a hint, as the authorization step always did.
  const pendingConsents = (step?.fields || []).some((f) =>
    f.type === 'consent' && f.required && isFieldShown(f, values, rootFields, values, rootFields) && getPath(values, f.path) !== true
  );

  const handleNext = async () => {
    if (!step) return;
    const stepErrors = collectErrors(step.id);
    if (Object.keys(stepErrors).length > 0) {
      showValidationErrors(stepErrors);
      return;
    }
    setFieldErrors({});
    setErrorSummary([]);

    // Save progress before advancing. Best-effort: never blocks navigation.
    setSaving(true);
    try {
      await onSaveProgress(values);
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      setSaving(false);
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---- submit -------------------------------------------------------------
  const requiredSlotsDone = slots.filter((s) => s.required).every((s) => uploadStatus[s.key] === 'success');
  const groupsDone = groups.every((g) => !g.required || g.subDocs.some((sd) => uploadStatus[sd.key] === 'success'));
  const anyUploading = Object.values(uploadStatus).some((s) => s === 'uploading');
  const documentsReady = requiredSlotsDone && groupsDone && !anyUploading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLast) return;

    // Final check across every step — a candidate can reach Submit with an
    // earlier step still invalid (e.g. by editing after passing it).
    const allErrors = collectErrors();
    if (Object.keys(allErrors).length > 0) {
      showValidationErrors(allErrors);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (!result.ok) {
        if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
          showValidationErrors(result.fieldErrors);
          return;
        }
        alert(result.message || 'Failed to submit form');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      if (err?.fieldErrors && Object.keys(err.fieldErrors).length > 0) showValidationErrors(err.fieldErrors);
      else alert(err?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  if (!step) {
    return <p className="text-sm text-gray-500">This form has no steps.</p>;
  }

  // A non-breaking space keeps steps without a subtitle aligned with the rest.
  const stepperSteps: Step[] = steps.map((s, i) => ({ id: i + 1, title: s.title, description: s.description || '\u00A0' }));
  const errorsShown = Object.fromEntries(Object.entries(fieldErrors).filter(([p]) => touched[p]));

  const nextButton = (
    <Button type="button" onClick={handleNext} disabled={saving || pendingConsents} className="bg-brand-green hover:bg-brand-green-600 text-white px-4 sm:px-8" size="lg">
      {saving ? <><Loader2 className="mr-2 w-5 h-5 animate-spin" /> Saving...</> : <>Next <ChevronRight className="ml-2 w-5 h-5" /></>}
    </Button>
  );

  return (
    <>
      <div className="mb-6 sm:mb-8">
        <Stepper steps={stepperSteps} currentStep={stepIndex + 1} />
      </div>

      <Card className="shadow-xl">
        <CardContent className="px-3 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit} noValidate>
            {errorSummary.length > 0 && (
              <div className="mb-4 p-3 border border-red-300 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Please correct the highlighted fields in: <strong>{errorSummary.join(', ')}</strong>. We have taken you to the first one.
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm">{stepIndex + 1}</div>
                <h3 className="text-xl font-semibold">{step.heading || step.title}</h3>
              </div>
              {step.helpText && step.type !== 'documents' && (
                <p className="text-sm text-gray-600 whitespace-pre-line">{step.helpText}</p>
              )}

              {(step.fields || []).length > 0 && (
                // The authorization step sits in a grey panel, as it always has.
                <div className={step.id === 'loa' ? 'bg-gray-50 p-4 sm:p-6 rounded-lg' : ''}>
                <StepFields
                  template={template}
                  step={step}
                  values={values}
                  setValue={setValue}
                  errors={errorsShown}
                  touched={touched}
                  onBlurPath={revalidateField}
                  uploadFor={uploadFor}
                />
                </div>
              )}

              {step.type === 'documents' && (
                <DocumentUploads
                  slots={slots}
                  groups={groups}
                  uploadStatus={uploadStatus}
                  uploadErrors={uploadErrors}
                  fileNames={fileNames}
                  onSelect={handleFile}
                  helpText={step.helpText}
                />
              )}

              {isLast && !documentsReady && !anyUploading && (slots.length > 0 || groups.length > 0) && (
                <p className="text-sm text-amber-600 text-center">Please upload all required documents before submitting.</p>
              )}

              <div className={`flex ${stepIndex === 0 ? 'justify-end' : 'justify-between'} pt-4`}>
                {stepIndex > 0 && (
                  <Button type="button" onClick={handleBack} variant="outline" size="lg" className={isLast ? 'border-brand-green text-brand-green hover:bg-brand-green-50' : ''}>
                    <ChevronLeft className="mr-2 w-5 h-5" /> Previous
                  </Button>
                )}
                {isLast ? (
                  <Button type="submit" disabled={submitting || !documentsReady || pendingConsents} className="bg-brand-green hover:bg-brand-green-600 text-white px-4 sm:px-8" size="lg">
                    {submitting ? 'Submitting...' : submitLabel}
                  </Button>
                ) : nextButton}
              </div>
              {pendingConsents && (
                <p className="text-sm text-gray-500 text-right">Please accept all authorization checkboxes to proceed</p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
};

export default BgvFormRunner;
