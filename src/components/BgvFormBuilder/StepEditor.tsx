import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Plus, Trash2 } from 'lucide-react';
import { FieldType, TemplateField, TemplateStep } from '@/lib/bgvForm/types';
import { FIELD_TYPE_OPTIONS, FieldRef, fieldTypeLabel, shortLabel } from './builderUtils';

// The selected step: its own wording, and its list of fields (with the fields
// of any repeating section nested underneath).

interface StepEditorProps {
  step: TemplateStep;
  stepHiddenByDependency: boolean;
  selected: FieldRef | null;
  onSelect: (ref: FieldRef) => void;
  onStepChange: (patch: Partial<TemplateStep>) => void;
  onAddField: (type: FieldType, parentId?: string) => void;
  onMoveField: (fieldId: string, delta: number, parentId?: string) => void;
  onToggleField: (fieldId: string, parentId?: string) => void;
  onDeleteField: (fieldId: string, parentId?: string) => void;
}

const AddFieldMenu: React.FC<{ onAdd: (type: FieldType) => void; inRepeater?: boolean; label?: string }> = ({ onAdd, inRepeater, label }) => {
  const [open, setOpen] = useState(false);
  const options = FIELD_TYPE_OPTIONS.filter((o) => !inRepeater || (o.type !== 'repeater' && o.type !== 'file'));
  return (
    <div className="relative inline-block">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <Plus className="w-3.5 h-3.5 mr-1" /> {label || 'Add field'}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-72 max-h-80 overflow-y-auto rounded-md border bg-white shadow-lg">
            {options.map((o) => (
              <button
                key={o.type}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                onClick={() => { onAdd(o.type); setOpen(false); }}
              >
                <span className="block text-sm font-medium text-gray-800">{o.label}</span>
                <span className="block text-xs text-gray-500">{o.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const StepEditor: React.FC<StepEditorProps> = ({
  step, stepHiddenByDependency, selected, onSelect, onStepChange, onAddField, onMoveField, onToggleField, onDeleteField,
}) => {
  const isDocuments = step.type === 'documents';

  const fieldRow = (field: TemplateField, index: number, list: TemplateField[], parentId?: string) => {
    const isSelected = selected?.fieldId === field.id && selected?.parentId === parentId;
    return (
      <div
        key={field.id}
        className={`flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer ${
          isSelected ? 'border-brand-green bg-brand-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
        } ${field.hidden ? 'opacity-50' : ''}`}
        onClick={() => onSelect({ stepId: step.id, fieldId: field.id, parentId })}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate">
            {shortLabel(field.label, 70)}
            {(field.required || field.displayRequired) && <span className="text-red-500"> *</span>}
          </p>
          <p className="text-[11px] text-gray-400">
            {fieldTypeLabel(field.type)}
            {field.builtIn ? ' · standard' : ' · custom'}
            {field.showIf ? ' · conditional' : ''}
            {(field.validations || []).length ? ` · ${(field.validations || []).length} check${(field.validations || []).length === 1 ? '' : 's'}` : ''}
            {field.hidden ? ' · hidden' : ''}
          </p>
        </div>
        {field.locked && <span title="Needed for the report"><Lock className="w-3.5 h-3.5 text-gray-400" /></span>}
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={index === 0} onClick={() => onMoveField(field.id, -1, parentId)} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
          <button type="button" className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={index === list.length - 1} onClick={() => onMoveField(field.id, 1, parentId)} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
          <button
            type="button"
            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
            disabled={field.locked}
            onClick={() => onToggleField(field.id, parentId)}
            title={field.hidden ? 'Show' : 'Hide'}
          >
            {field.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          {!field.builtIn && (
            <button type="button" className="p-1 text-gray-400 hover:text-red-600" onClick={() => onDeleteField(field.id, parentId)} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {stepHiddenByDependency && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
          This step is not shown because the step it depends on is hidden.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-gray-600">Step name (progress bar)</Label>
          <Input className="mt-1 h-8 text-sm" maxLength={60} value={step.title} onChange={(e) => onStepChange({ title: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Subtitle (progress bar)</Label>
          <Input className="mt-1 h-8 text-sm" value={step.description || ''} onChange={(e) => onStepChange({ description: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Heading on the page</Label>
          <Input className="mt-1 h-8 text-sm" value={step.heading || ''} onChange={(e) => onStepChange({ heading: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Name in the invitation email</Label>
          <Input className="mt-1 h-8 text-sm" value={step.checklistLabel || ''} placeholder={step.heading || step.title} onChange={(e) => onStepChange({ checklistLabel: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs text-gray-600">Instructions at the top of the step</Label>
          <textarea
            className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            rows={2}
            value={step.helpText || ''}
            onChange={(e) => onStepChange({ helpText: e.target.value })}
          />
        </div>
      </div>

      {isDocuments ? (
        <p className="text-sm text-gray-500">The documents on this step are edited under <strong>Documents</strong> in the left column.</p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">Fields</h4>
            <AddFieldMenu onAdd={(type) => onAddField(type)} />
          </div>
          {step.fields.length === 0 && <p className="text-sm text-gray-400">No fields yet.</p>}
          {step.fields.map((field, i) => (
            <div key={field.id} className="space-y-1">
              {fieldRow(field, i, step.fields)}
              {field.type === 'repeater' && (
                <div className="ml-6 pl-3 border-l-2 border-gray-200 space-y-1">
                  {(field.itemFields || []).map((it, j) => fieldRow(it, j, field.itemFields || [], field.id))}
                  {field.widget !== 'gapDetails' && (
                    <AddFieldMenu inRepeater label={`Add field to ${shortLabel(field.label, 24)}`} onAdd={(type) => onAddField(type, field.id)} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StepEditor;
