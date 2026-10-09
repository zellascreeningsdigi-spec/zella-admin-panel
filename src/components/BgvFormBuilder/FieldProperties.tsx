import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDown, ArrowUp, Lock, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import {
  FieldType,
  FormTemplate,
  RuleCatalogEntry,
  TemplateField,
  TemplateRule,
  isSafeRegex,
} from '@/lib/bgvForm/types';
import {
  FIELD_TYPE_OPTIONS,
  FieldRef,
  fieldTypeLabel,
  hasOptions,
  move,
  referencableFields,
} from './builderUtils';

// Properties of the selected field: wording, requiredness, visibility,
// options, conditional display and validation rules.

const RULES_BY_TYPE: Partial<Record<FieldType, string[]>> = {
  text: ['meaningfulText', 'minLength', 'maxLength', 'pattern', 'mobile', 'email', 'aadhaar', 'pan', 'year', 'ctc'],
  textarea: ['meaningfulText', 'minLength', 'maxLength', 'pattern'],
  number: ['min', 'max', 'integer'],
  email: ['email', 'maxLength', 'pattern'],
  phone: ['mobile', 'pattern', 'minLength', 'maxLength'],
  date: ['dateNotFuture', 'dateAfter'],
  month: ['dateNotFuture', 'dateAfter'],
  dropdown: ['oneOf'],
  radio: ['oneOf'],
  multiselect: ['oneOf'],
};

interface FieldPropertiesProps {
  template: FormTemplate;
  fieldRef: FieldRef;
  field: TemplateField;
  rules: Record<string, RuleCatalogEntry>;
  canRemoveProtected: boolean;
  onChange: (patch: Partial<TemplateField>) => void;
  onDelete: () => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2 pt-4 border-t first:border-t-0 first:pt-0">
    <h5 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h5>
    {children}
  </div>
);

const TextProp: React.FC<{
  label: string; value?: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; hint?: string;
}> = ({ label, value, onChange, placeholder, multiline, hint }) => (
  <div>
    <Label className="text-xs text-gray-600">{label}</Label>
    {multiline ? (
      <textarea
        className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
        rows={3}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <Input className="mt-1 h-8 text-sm" value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    )}
    {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

const NumberProp: React.FC<{ label: string; value?: number; onChange: (v: number | undefined) => void }> = ({ label, value, onChange }) => (
  <div>
    <Label className="text-xs text-gray-600">{label}</Label>
    <Input
      type="number"
      min={0}
      max={50}
      className="mt-1 h-8 text-sm"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0))}
    />
  </div>
);

const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }> = ({
  label, checked, onChange, disabled, hint,
}) => (
  <label className={`flex items-start gap-2 text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span>
      {label}
      {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
    </span>
  </label>
);

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'option';

const formatDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const FieldProperties: React.FC<FieldPropertiesProps> = ({
  template, fieldRef, field, rules, canRemoveProtected, onChange, onDelete,
}) => {
  const isBuiltIn = !!field.builtIn;
  const isLocked = !!field.locked;
  const lockedConsent = isLocked && field.type === 'consent';
  const options = field.options || [];
  const validations = field.validations || [];
  const refs = referencableFields(template, { stepId: fieldRef.stepId, parentId: fieldRef.parentId })
    .filter((r) => r.id !== field.id);
  const showIfTarget = refs.find((r) => r.id === field.showIf?.field)?.field;
  const allowedRules = Array.from(new Set([...(RULES_BY_TYPE[field.type] || []), ...validations.map((v) => v.rule)]));

  // ---- options ------------------------------------------------------------
  const setOptions = (next: typeof options) => onChange({ options: next });
  const addOption = () => {
    const n = options.length + 1;
    const taken = new Set(options.map((o) => o.value));
    let value = `option_${n}`;
    while (taken.has(value)) value = `${value}_x`;
    setOptions([...options, { value, label: `Option ${n}` }]);
  };

  // ---- rules --------------------------------------------------------------
  const setRules = (next: TemplateRule[]) => onChange({ validations: next });
  const updateRule = (i: number, patch: Partial<TemplateRule>) =>
    setRules(validations.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRule = () => {
    const first = allowedRules.find((r) => !validations.some((v) => v.rule === r)) || allowedRules[0];
    if (first) setRules([...validations, { rule: first }]);
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{fieldTypeLabel(field.type)}</p>
          <p className="text-[11px] text-gray-400 font-mono break-all">{field.id}</p>
        </div>
        <div className="flex gap-1">
          {isBuiltIn && <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Standard</span>}
          {isLocked && <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-0.5"><Lock className="w-3 h-3" /> Required for report</span>}
        </div>
      </div>

      {field.relaxedByGuard && (
        <p className="text-[11px] text-amber-700 bg-amber-50 rounded p-2">Relaxed for candidates who started before this change.</p>
      )}

      <Section title="Wording">
        <TextProp
          label={field.type === 'consent' ? 'Declaration text' : field.type === 'info' ? 'Text shown' : 'Label'}
          value={field.label}
          multiline={field.type === 'consent' || field.type === 'info'}
          onChange={(label) => onChange({ label })}
        />
        {!['info', 'consent', 'checkbox', 'repeater', 'radio', 'multiselect', 'file'].includes(field.type) && (
          <TextProp label="Placeholder" value={field.placeholder} onChange={(placeholder) => onChange({ placeholder })} />
        )}
        {field.type !== 'info' && (
          <TextProp label="Help text" value={field.helpText} onChange={(helpText) => onChange({ helpText })} hint="Shown under the label" />
        )}
        {!['info', 'file', 'repeater'].includes(field.type) && (
          <TextProp
            label="Label in report"
            value={field.reportLabel}
            onChange={(reportLabel) => onChange({ reportLabel })}
            hint={isBuiltIn ? 'Leave empty to keep the report’s standard wording' : 'Leave empty to use the label'}
          />
        )}
        {!isBuiltIn && field.type !== 'repeater' && (
          <div>
            <Label className="text-xs text-gray-600">Answer type</Label>
            <select
              className="mt-1 w-full h-8 px-2 border border-gray-300 rounded-md text-sm bg-white"
              value={field.type}
              onChange={(e) => {
                const type = e.target.value as FieldType;
                const patch: Partial<TemplateField> = { type, validations: [] };
                if (hasOptions(type) && !field.options?.length) patch.options = [{ value: 'option_1', label: 'Option 1' }];
                onChange(patch);
              }}
            >
              {FIELD_TYPE_OPTIONS
                .filter((o) => o.type !== 'repeater' && !(fieldRef.parentId && o.type === 'file'))
                .map((o) => <option key={o.type} value={o.type}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div>
          <Label className="text-xs text-gray-600">Width</Label>
          <select
            className="mt-1 w-full h-8 px-2 border border-gray-300 rounded-md text-sm bg-white"
            value={field.width || ''}
            onChange={(e) => onChange({ width: (e.target.value || undefined) as TemplateField['width'] })}
          >
            <option value="">Automatic</option>
            <option value="full">Full row</option>
            <option value="half">Half row</option>
            <option value="third">Third of a row</option>
          </select>
        </div>
      </Section>

      {field.type !== 'info' && (
        <Section title="Rules">
          {field.type !== 'repeater' && (
            <Toggle
              label={field.type === 'consent' ? 'Must be accepted' : field.type === 'file' ? 'Upload required' : 'Required'}
              checked={!!field.required}
              disabled={lockedConsent}
              onChange={(required) => onChange({ required, displayRequired: required ? field.displayRequired : false })}
              hint={
                field.requiredFrom
                  ? `Only enforced for candidates added on or after ${formatDate(field.requiredFrom)}`
                  : !field.required && field.displayRequired
                    ? 'Shows a * but is not enforced (as on the original form)'
                    : undefined
              }
            />
          )}
          {field.required && field.type !== 'repeater' && (
            <TextProp label="Message when missing" value={field.requiredMessage} placeholder="This field is required" onChange={(requiredMessage) => onChange({ requiredMessage })} />
          )}
          <Toggle
            label="Hide this field"
            checked={!!field.hidden}
            disabled={isLocked}
            onChange={(hidden) => onChange({ hidden })}
            hint={isLocked ? 'This field is needed for the report and the authorization' : 'Answers already given are kept'}
          />
        </Section>
      )}

      {field.type === 'info' && (
        <Section title="Visibility">
          <Toggle label="Hide" checked={!!field.hidden} onChange={(hidden) => onChange({ hidden })} />
        </Section>
      )}

      {hasOptions(field.type) && (
        <Section title="Options">
          <div className="space-y-1.5">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  className="h-8 text-sm flex-1"
                  value={o.label}
                  placeholder="Label"
                  onChange={(e) => setOptions(options.map((x, idx) => idx === i
                    ? { label: e.target.value, value: isBuiltIn ? x.value : (x.value.startsWith('option_') ? slug(e.target.value) : x.value) }
                    : x))}
                />
                <button type="button" className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={i === 0} onClick={() => setOptions(move(options, i, -1))} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={i === options.length - 1} onClick={() => setOptions(move(options, i, 1))} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                <button type="button" className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30" disabled={options.length <= 1} onClick={() => setOptions(options.filter((_, idx) => idx !== i))} title="Remove option"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addOption}><Plus className="w-3.5 h-3.5 mr-1" /> Add option</Button>
          {isBuiltIn && <p className="text-[11px] text-gray-400">Stored values of standard options stay the same when you rename them.</p>}
        </Section>
      )}

      {field.type !== 'repeater' && (
        <Section title="Show only if">
          <select
            className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm bg-white"
            value={field.showIf?.field || ''}
            onChange={(e) => onChange({ showIf: e.target.value ? { field: e.target.value, equals: '' } : undefined })}
          >
            <option value="">Always show</option>
            {refs.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          {field.showIf?.field && (
            showIfTarget && hasOptions(showIfTarget.type) ? (
              <select
                className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm bg-white"
                value={String(field.showIf.equals ?? '')}
                onChange={(e) => onChange({ showIf: { field: field.showIf!.field, equals: e.target.value } })}
              >
                <option value="">— choose the answer —</option>
                {(showIfTarget.options || []).map((o) => <option key={o.value} value={o.value}>is “{o.label}”</option>)}
              </select>
            ) : showIfTarget && ['checkbox', 'consent'].includes(showIfTarget.type) ? (
              <select
                className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm bg-white"
                value={String(field.showIf.equals)}
                onChange={(e) => onChange({ showIf: { field: field.showIf!.field, equals: e.target.value === 'true' } })}
              >
                <option value="true">is ticked</option>
                <option value="false">is not ticked</option>
              </select>
            ) : (
              <Input
                className="h-8 text-sm"
                placeholder="equals this answer"
                value={String(field.showIf.equals ?? '')}
                onChange={(e) => onChange({ showIf: { field: field.showIf!.field, equals: e.target.value } })}
              />
            )
          )}
        </Section>
      )}

      {allowedRules.length > 0 && (
        <Section title="Validation">
          {validations.length === 0 && <p className="text-xs text-gray-400">No checks on this answer.</p>}
          <div className="space-y-2">
            {validations.map((rule, i) => {
              const def = rules[rule.rule];
              const locked = !!rule.protected && !canRemoveProtected;
              const patternUnsafe = rule.rule === 'pattern' && typeof rule.value === 'string' && rule.value && !isSafeRegex(rule.value);
              let patternInvalid = false;
              if (rule.rule === 'pattern' && typeof rule.value === 'string' && rule.value) {
                try { new RegExp(rule.value); } catch { patternInvalid = true; }
              }
              return (
                <div key={i} className="rounded-md border border-gray-200 p-2 space-y-1.5 bg-gray-50">
                  <div className="flex items-center gap-1">
                    {rule.protected && <span title="Protected: other systems rely on this check"><ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" /></span>}
                    <select
                      className="flex-1 h-8 px-2 border border-gray-300 rounded-md text-sm bg-white"
                      value={rule.rule}
                      disabled={!!rule.protected}
                      onChange={(e) => updateRule(i, { rule: e.target.value, value: undefined })}
                    >
                      {allowedRules.map((r) => <option key={r} value={r}>{rules[r]?.label || r}</option>)}
                    </select>
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30"
                      disabled={locked}
                      title={locked ? 'Only a super-admin can remove a protected check' : 'Remove check'}
                      onClick={() => {
                        if (rule.protected && !window.confirm('This check protects data that vendor checks and reports rely on. Remove it anyway?')) return;
                        setRules(validations.filter((_, idx) => idx !== i));
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {def?.valueType === 'number' && (
                    <Input type="number" className="h-8 text-sm" placeholder="Value" value={rule.value ?? ''} onChange={(e) => updateRule(i, { value: e.target.value === '' ? undefined : Number(e.target.value) })} />
                  )}
                  {def?.valueType === 'pattern' && (
                    <>
                      <Input className="h-8 text-sm font-mono" placeholder="e.g. ^[A-Z]{2}\d{6}$" value={rule.value ?? ''} onChange={(e) => updateRule(i, { value: e.target.value })} />
                      {patternInvalid && <p className="text-[11px] text-red-600">Not a valid pattern.</p>}
                      {patternUnsafe && !patternInvalid && <p className="text-[11px] text-red-600">This pattern repeats inside a repeat and could freeze the form. Simplify it.</p>}
                    </>
                  )}
                  {def?.valueType === 'field' && (
                    <select className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm bg-white" value={rule.value || ''} onChange={(e) => updateRule(i, { value: e.target.value })}>
                      <option value="">— must be after —</option>
                      {refs.filter((r) => ['date', 'month'].includes(r.field.type)).map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  )}
                  {rule.rule === 'meaningfulText' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        className="h-8 text-sm w-24"
                        placeholder="Min chars"
                        value={rule.value?.minLength ?? ''}
                        onChange={(e) => updateRule(i, { value: { ...(rule.value || {}), minLength: e.target.value === '' ? undefined : Number(e.target.value) } })}
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={!!rule.value?.allowCode} onChange={(e) => updateRule(i, { value: { ...(rule.value || {}), allowCode: e.target.checked || undefined } })} />
                        It is a code / ID
                      </label>
                    </div>
                  )}
                  <Input className="h-8 text-sm" placeholder="Error message (optional)" value={rule.message || ''} onChange={(e) => updateRule(i, { message: e.target.value })} />
                </div>
              );
            })}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addRule}><Plus className="w-3.5 h-3.5 mr-1" /> Add check</Button>
        </Section>
      )}

      {field.type === 'repeater' && (
        <Section title="Repeating section">
          <TextProp label="Name of one entry" value={field.itemLabel} placeholder="Entry" onChange={(itemLabel) => onChange({ itemLabel })} />
          {field.widget !== 'gapDetails' && (
            <>
              <TextProp label="Add button text" value={field.addLabel} placeholder="Add entry" onChange={(addLabel) => onChange({ addLabel })} />
              <TextProp label="Text when empty" value={field.emptyText} onChange={(emptyText) => onChange({ emptyText })} />
              <div className="grid grid-cols-3 gap-2">
                <NumberProp label="Min entries" value={field.minItems} onChange={(minItems) => onChange({ minItems })} />
                <NumberProp label="Max entries" value={field.maxItems} onChange={(maxItems) => onChange({ maxItems })} />
                <NumberProp label="Start with" value={field.initialItems} onChange={(initialItems) => onChange({ initialItems })} />
              </div>
              <NumberProp label="Must fill at least" value={field.minFilled} onChange={(minFilled) => onChange({ minFilled })} />
              {(field.minFilled ?? 0) > 0 && (
                <TextProp label="Message when too few" value={field.minFilledMessage} onChange={(minFilledMessage) => onChange({ minFilledMessage })} />
              )}
            </>
          )}
          <Toggle label="Hide this section" checked={!!field.hidden} onChange={(hidden) => onChange({ hidden })} hint="Answers already given are kept" />
        </Section>
      )}

      {!isBuiltIn && (
        <div className="pt-4 border-t">
          <Button type="button" variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete field
          </Button>
          <p className="text-[11px] text-gray-400 mt-1">Answers already given are kept and remain visible to admins.</p>
        </div>
      )}
    </div>
  );
};

export default FieldProperties;
