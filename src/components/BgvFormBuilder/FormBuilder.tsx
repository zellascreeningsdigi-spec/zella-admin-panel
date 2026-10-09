import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Eye, EyeOff, FileText, History, Loader2,
  Lock, MonitorSmartphone, Plus, RotateCcw, Trash2, X,
} from 'lucide-react';
import { apiService } from '@/services/api';
import {
  CurrentForm,
  FieldType,
  FormTemplate,
  RuleCatalogEntry,
  TemplateField,
  TemplateImpact,
  TemplateVersionSummary,
  clone,
  prepareForCandidate,
  validateTemplateDefinition,
} from '@/lib/bgvForm/types';
import {
  FieldRef,
  findStepVisible,
  createField,
  createStep,
  findFieldRef,
  fingerprint,
  move,
  updateField,
  updateFieldList,
  updateStep,
} from './builderUtils';
import StepEditor from './StepEditor';
import FieldProperties from './FieldProperties';
import DocumentsEditor from './DocumentsEditor';
import SaveFormDialog, { SaveOptions } from './SaveFormDialog';
import BgvFormRunner from '@/components/BgvForm/BgvFormRunner';
import { initialFormValues } from '@/lib/bgvForm/formState';

// The BGV form builder for one company or one group.
//
// The admin edits a draft copy of the current form; nothing reaches candidates
// until Save, which writes a new immutable version on the server. Every check
// the server makes is run here first (the engine is shared), so a save is only
// refused for something the admin can see and fix.

interface FormBuilderProps {
  ownerType: 'company' | 'group';
  ownerId: string;
  /** Company or group name, for the title. */
  ownerName: string;
  onClose: () => void;
  onSaved?: () => void;
}

type Selection = { kind: 'step'; stepId: string } | { kind: 'field'; ref: FieldRef } | { kind: 'documents' };

const newBatchId = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

const sourceLabel = (current: CurrentForm | null) => {
  if (!current) return '';
  if (current.version) return `Version ${current.version}`;
  return 'Standard form (not customised yet)';
};

const FormBuilder: React.FC<FormBuilderProps> = ({ ownerType, ownerId, ownerName, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [current, setCurrent] = useState<CurrentForm | null>(null);
  const [versions, setVersions] = useState<TemplateVersionSummary[]>([]);
  const [rules, setRules] = useState<Record<string, RuleCatalogEntry>>({});
  const [canRemoveProtected, setCanRemoveProtected] = useState(false);

  const [draft, setDraft] = useState<FormTemplate | null>(null);
  const [restoredFrom, setRestoredFrom] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const [problems, setProblems] = useState<string[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [impact, setImpact] = useState<TemplateImpact | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await apiService.getBgvFormTemplate(ownerType, ownerId);
      if (!response.success) throw new Error(response.message || 'Could not load the form');
      const data = response.data;
      setCurrent(data.current);
      setVersions(data.versions || []);
      setRules(data.rules || {});
      setCanRemoveProtected(!!data.canRemoveProtectedRules);
      setDraft(clone(data.current.definition));
      setRestoredFrom(null);
      setSelection((prev) => prev || { kind: 'step', stepId: data.current.definition.steps[0]?.id });
    } catch (error: any) {
      setLoadError(error.message || 'Could not load the form');
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(
    () => !!draft && !!current && fingerprint(draft) !== fingerprint(current.definition),
    [draft, current]
  );

  const requestClose = () => {
    if (dirty && !window.confirm('You have unsaved changes. Close the builder and lose them?')) return;
    onClose();
  };

  // ---- draft edits --------------------------------------------------------
  const edit = (fn: (t: FormTemplate) => FormTemplate) => {
    setDraft((prev) => (prev ? fn(prev) : prev));
    setProblems([]);
    setSavedMessage(null);
  };

  const selectedStepId = selection?.kind === 'step' ? selection.stepId : selection?.kind === 'field' ? selection.ref.stepId : null;
  const selectedStep = draft?.steps.find((s) => s.id === selectedStepId) || null;
  const selectedFieldRef = selection?.kind === 'field' ? selection.ref : null;
  const selectedField = draft ? findFieldRef(draft, selectedFieldRef) : null;

  const addStep = () => {
    const step = createStep();
    edit((t) => {
      const next = clone(t);
      // New steps go before Letter of Authorization, which stays near the end.
      const loaIndex = next.steps.findIndex((s) => s.id === 'loa');
      next.steps.splice(loaIndex >= 0 ? loaIndex : next.steps.length, 0, step);
      return next;
    });
    setSelection({ kind: 'step', stepId: step.id });
  };

  const moveStep = (stepId: string, delta: number) =>
    edit((t) => {
      const next = clone(t);
      const i = next.steps.findIndex((s) => s.id === stepId);
      next.steps = move(next.steps, i, delta);
      return next;
    });

  const deleteStep = (stepId: string) => {
    const step = draft?.steps.find((s) => s.id === stepId);
    if (!step || step.builtIn) return;
    if (!window.confirm(`Delete the step "${step.title}" and its ${step.fields.length} field(s)? Answers already given are kept.`)) return;
    edit((t) => ({ ...clone(t), steps: t.steps.filter((s) => s.id !== stepId) }));
    setSelection({ kind: 'step', stepId: draft!.steps[0].id });
  };

  const addField = (type: FieldType, parentId?: string) => {
    if (!selectedStep) return;
    const field = createField(type, !!parentId);
    edit((t) => updateFieldList(t, selectedStep.id, parentId, (fields) => [...fields, field]));
    setSelection({ kind: 'field', ref: { stepId: selectedStep.id, fieldId: field.id, parentId } });
  };

  const fieldListOp = (fieldId: string, parentId: string | undefined, fn: (fields: TemplateField[], index: number) => TemplateField[]) => {
    if (!selectedStep) return;
    edit((t) => updateFieldList(t, selectedStep.id, parentId, (fields) => fn(fields, fields.findIndex((f) => f.id === fieldId))));
  };

  const deleteField = (fieldId: string, parentId?: string) => {
    if (!window.confirm('Delete this field? Answers already given are kept and remain visible to admins.')) return;
    fieldListOp(fieldId, parentId, (fields) => fields.filter((f) => f.id !== fieldId));
    if (selectedStep) setSelection({ kind: 'step', stepId: selectedStep.id });
  };

  // ---- save ---------------------------------------------------------------
  const startSave = async () => {
    if (!draft) return;
    const checked = validateTemplateDefinition(draft, { allowProtectedRemoval: canRemoveProtected });
    if (!checked.ok) {
      setProblems(checked.errors);
      return;
    }
    setProblems([]);
    setImpact(null);
    setSaveOpen(true);
    try {
      const response = await apiService.getBgvFormTemplateImpact(ownerType, ownerId, checked.value);
      setImpact(response.data);
    } catch (error: any) {
      setSaveOpen(false);
      setProblems(error?.data?.errors || [error.message || 'Could not check the form']);
    }
  };

  const confirmSave = async (options: SaveOptions) => {
    if (!draft) return;
    try {
      setSaving(true);
      const response = await apiService.saveBgvFormTemplate(ownerType, ownerId, {
        definition: draft,
        note: options.note,
        applyToNotStarted: options.applyToNotStarted,
        reissueStarted: options.reissueStarted,
        batchId: options.reissueStarted ? newBatchId() : undefined,
        restoredFrom: restoredFrom || undefined,
      });
      const data = response.data || {};
      const parts = [`Saved as version ${data.version?.version}.`];
      if (data.applied) parts.push(`${data.applied.updated} candidate(s) moved to the new form.`);
      if (data.reissue) {
        parts.push(`${data.reissue.reissued} new link(s) sent.`);
        if (data.reissue.emailFailures?.length) parts.push(`Email failed for ${data.reissue.emailFailures.length} — use "Send Link" for them.`);
      }
      setSaveOpen(false);
      await load();
      setSavedMessage(parts.join(' '));
      onSaved?.();
    } catch (error: any) {
      setSaveOpen(false);
      setProblems(error?.data?.errors || [error.message || 'Could not save the form']);
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (dirty && !window.confirm('Replace your unsaved changes with this version?')) return;
    try {
      const response = await apiService.getBgvFormTemplateVersion(versionId);
      setDraft(clone(response.data.definition));
      setRestoredFrom(versionId);
      setHistoryOpen(false);
      setSelection({ kind: 'step', stepId: response.data.definition.steps[0]?.id });
      setSavedMessage(`Version ${response.data.version} loaded. Review it, then Save to make it the current form.`);
    } catch (error: any) {
      setProblems([error.message || 'Could not load that version']);
    }
  };

  // ---- render -------------------------------------------------------------
  if (loading && !draft) {
    return <div className="p-10 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading form…</div>;
  }
  if (loadError || !draft) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600 mb-4">{loadError || 'Could not load the form'}</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }

  const employmentShown = findStepVisible(draft, 'employment');

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 bg-white">
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-lg font-semibold text-gray-900">BGV form — {ownerName}</h2>
          <p className="text-xs text-gray-500">
            {sourceLabel(current)}
            {dirty && <span className="text-amber-600"> · unsaved changes</span>}
            {restoredFrom && <span className="text-blue-600"> · restored from history</span>}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
          <History className="w-4 h-4 mr-1" /> History ({versions.length})
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
          <MonitorSmartphone className="w-4 h-4 mr-1" /> Preview
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!dirty}
          onClick={() => { if (window.confirm('Discard all unsaved changes?')) { setDraft(clone(current!.definition)); setRestoredFrom(null); setProblems([]); } }}
        >
          <RotateCcw className="w-4 h-4 mr-1" /> Discard
        </Button>
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={startSave}>
          {saving ? 'Saving…' : 'Save form'}
        </Button>
        <button type="button" className="p-1.5 text-gray-400 hover:text-gray-700" onClick={requestClose} title="Close"><X className="w-5 h-5" /></button>
      </div>

      {(problems.length > 0 || savedMessage) && (
        <div className="px-4 pt-3">
          {problems.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700" role="alert">
              <p className="font-medium flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Fix these before saving:</p>
              <ul className="list-disc pl-5 mt-1 space-y-0.5">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
          {savedMessage && problems.length === 0 && (
            <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2" role="status">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {savedMessage}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_340px] gap-0">
        {/* Steps */}
        <div className="border-r overflow-y-auto p-3 space-y-1 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Steps</h3>
            <Button type="button" variant="ghost" size="sm" onClick={addStep}><Plus className="w-3.5 h-3.5 mr-1" /> Step</Button>
          </div>
          {draft.steps.map((step, i) => {
            const active = selectedStepId === step.id && selection?.kind !== 'documents';
            const shown = findStepVisible(draft, step.id);
            return (
              <div
                key={step.id}
                onClick={() => setSelection({ kind: 'step', stepId: step.id })}
                className={`group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer text-sm ${active ? 'bg-white border border-brand-green shadow-sm' : 'hover:bg-white border border-transparent'} ${shown ? '' : 'opacity-50'}`}
              >
                <span className="w-5 text-xs text-gray-400">{i + 1}</span>
                <span className="flex-1 truncate">{step.title}</span>
                {step.locked && <Lock className="w-3 h-3 text-gray-400" />}
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={i === 0} onClick={() => moveStep(step.id, -1)} title="Move up"><ArrowUp className="w-3 h-3" /></button>
                  <button type="button" className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={i === draft.steps.length - 1} onClick={() => moveStep(step.id, 1)} title="Move down"><ArrowDown className="w-3 h-3" /></button>
                  <button
                    type="button"
                    className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                    disabled={step.locked}
                    title={step.hidden ? 'Show step' : 'Hide step'}
                    onClick={() => edit((t) => updateStep(t, step.id, { hidden: !step.hidden }))}
                  >
                    {step.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                  {!step.builtIn && (
                    <button type="button" className="p-0.5 text-gray-400 hover:text-red-600" title="Delete step" onClick={() => deleteStep(step.id)}><Trash2 className="w-3 h-3" /></button>
                  )}
                </div>
              </div>
            );
          })}
          <div className="pt-3 mt-2 border-t">
            <div
              onClick={() => setSelection({ kind: 'documents' })}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm ${selection?.kind === 'documents' ? 'bg-white border border-brand-green shadow-sm' : 'hover:bg-white border border-transparent'}`}
            >
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="flex-1">Documents</span>
              <span className="text-xs text-gray-400">{draft.documents.filter((d) => !d.hidden).length}</span>
            </div>
          </div>
        </div>

        {/* Selected step or documents */}
        <div className="overflow-y-auto p-4 min-h-0">
          {selection?.kind === 'documents' ? (
            <DocumentsEditor
              documents={draft.documents}
              employmentShown={employmentShown}
              onChange={(documents) => edit((t) => ({ ...clone(t), documents }))}
            />
          ) : selectedStep ? (
            <StepEditor
              step={selectedStep}
              stepHiddenByDependency={!selectedStep.hidden && !findStepVisible(draft, selectedStep.id)}
              selected={selectedFieldRef}
              onSelect={(ref) => setSelection({ kind: 'field', ref })}
              onStepChange={(patch) => edit((t) => updateStep(t, selectedStep.id, patch))}
              onAddField={addField}
              onMoveField={(fieldId, delta, parentId) => fieldListOp(fieldId, parentId, (fields, i) => move(fields, i, delta))}
              onToggleField={(fieldId, parentId) => fieldListOp(fieldId, parentId, (fields) => fields.map((f) => (f.id === fieldId ? { ...f, hidden: !f.hidden } : f)))}
              onDeleteField={deleteField}
            />
          ) : (
            <p className="text-sm text-gray-500">Select a step.</p>
          )}
        </div>

        {/* Properties */}
        <div className="border-l overflow-y-auto p-4 bg-white min-h-0">
          {selectedField && selectedFieldRef ? (
            <FieldProperties
              key={selectedField.id}
              template={draft}
              fieldRef={selectedFieldRef}
              field={selectedField}
              rules={rules}
              canRemoveProtected={canRemoveProtected}
              onChange={(patch) => edit((t) => updateField(t, selectedFieldRef, patch))}
              onDelete={() => deleteField(selectedField.id, selectedFieldRef.parentId)}
            />
          ) : (
            <div className="text-sm text-gray-500 space-y-2">
              <p>Select a field to edit its label, rules and validation.</p>
              <p className="text-xs text-gray-400">
                Standard fields can be relabelled, hidden or made optional/required. Fields marked with a lock are needed
                for the report and the letter of authorization and cannot be hidden.
              </p>
            </div>
          )}
        </div>
      </div>

      <SaveFormDialog
        key={saveOpen ? 'open' : 'closed'}
        open={saveOpen}
        ownerType={ownerType}
        impact={impact}
        saving={saving}
        onCancel={() => setSaveOpen(false)}
        onConfirm={confirmSave}
      />

      {/* Preview: the real candidate form, with uploads and saves simulated */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-gradient-to-br from-brand-green-50 to-white">
          <DialogHeader>
            <DialogTitle>Preview — what a new candidate sees</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2 mb-2">Nothing here is saved or sent. Uploads are simulated.</p>
          {previewOpen && (
            <PreviewForm template={draft} />
          )}
        </DialogContent>
      </Dialog>

      {/* Version history */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
          </DialogHeader>
          {versions.length === 0 ? (
            <p className="text-sm text-gray-500">No saved versions yet. This {ownerType} uses the standard form{ownerType === 'company' ? ' with its classic settings' : ''}.</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v._id} className="flex items-start gap-3 rounded-md border border-gray-200 p-2">
                  <div className="flex-1 min-w-0 text-sm">
                    <p className="font-medium text-gray-800">
                      Version {v.version}
                      {current?.versionId === v._id && <span className="ml-2 text-xs text-green-700 bg-green-50 px-1.5 rounded">current</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(v.createdAt).toLocaleString('en-IN')}
                      {v.createdBy?.name ? ` · ${v.createdBy.name}` : ''}
                    </p>
                    {v.note && <p className="text-xs text-gray-700 mt-0.5">{v.note}</p>}
                  </div>
                  {current?.versionId !== v._id && (
                    <Button type="button" variant="outline" size="sm" onClick={() => restoreVersion(v._id)}>Restore</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** The candidate form running on the draft, with every side effect stubbed. */
const PreviewForm: React.FC<{ template: FormTemplate }> = ({ template }) => {
  const prepared = useMemo(() => prepareForCandidate(template, { createdAt: new Date() }), [template]);
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="w-10 h-10 text-brand-green mx-auto mb-2" />
        <p className="font-medium">The form would be submitted now.</p>
        <Button className="mt-4" variant="outline" onClick={() => setDone(false)}>Start again</Button>
      </div>
    );
  }
  return (
    <BgvFormRunner
      template={prepared}
      initialValues={initialFormValues(prepared)}
      onSaveProgress={async () => {}}
      onUpload={async () => { await new Promise((r) => setTimeout(r, 300)); }}
      onSubmit={async () => { setDone(true); return { ok: true }; }}
      submitLabel="Submit (preview)"
    />
  );
};

export default FormBuilder;
