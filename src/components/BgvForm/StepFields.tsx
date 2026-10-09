import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import FieldInput, { FieldError, FileUploadState } from './FieldInput';
import {
  FormTemplate,
  TemplateField,
  TemplateStep,
  getPath,
  isFieldShown,
  rootFieldList,
} from '@/lib/bgvForm/types';
import { emptyRow, FormValues, parseNumberInput } from '@/lib/bgvForm/formState';

// Renders the fields of one step from the template. All state lives in the
// page; this component only reads values and reports changes by path.

export interface StepFieldsProps {
  template: FormTemplate;
  step: TemplateStep;
  values: FormValues;
  setValue: (path: string, value: any) => void;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onBlurPath: (path: string) => void;
  /** Upload controls for file fields, by field id. */
  uploadFor?: (field: TemplateField) => FileUploadState;
  disabled?: boolean;
}

const spanClass = (field: TemplateField) => {
  const width = field.width
    || (['repeater', 'consent', 'textarea', 'info', 'checkbox', 'multiselect'].includes(field.type) ? 'full' : 'half');
  return width === 'full' ? 'md:col-span-6' : width === 'third' ? 'md:col-span-2' : 'md:col-span-3';
};

const StepFields: React.FC<StepFieldsProps> = (props) => {
  const { template, step, values, setValue, errors, touched, onBlurPath, uploadFor, disabled } = props;
  const rootFields = rootFieldList(template);
  const shownError = (path: string) => (touched[path] ? errors[path] : undefined);

  const changeHandler = (field: TemplateField, path: string) => (raw: any) => {
    const value = field.type === 'number' && typeof raw === 'string' ? parseNumberInput(field, raw) : raw;
    setValue(path, value);
  };

  const renderSimple = (field: TemplateField, path: string, value: any, domId: string, compact?: boolean) => (
    <FieldInput
      field={field}
      domId={domId}
      value={value}
      onChange={changeHandler(field, path)}
      onBlur={() => onBlurPath(path)}
      error={shownError(path)}
      upload={field.type === 'file' ? uploadFor?.(field) : undefined}
      compact={compact}
      disabled={disabled}
    />
  );

  // A render function, not a component: declaring a component inside render
  // would remount the inputs on every keystroke and drop focus.
  const renderRepeater = (field: TemplateField, hideLabel: boolean) => {
    const rows: FormValues[] = Array.isArray(getPath(values, field.path)) ? getPath(values, field.path) : [];
    const items = field.itemFields || [];
    const canAdd = field.widget !== 'gapDetails' && (field.maxItems === undefined || rows.length < field.maxItems);
    const canRemove = field.widget !== 'gapDetails' && rows.length > (field.minItems ?? 0);

    const add = () => setValue(field.path, [...rows, emptyRow(field)]);
    const remove = (i: number) => setValue(field.path, rows.filter((_, idx) => idx !== i));
    const rowPath = (i: number, item: TemplateField) => `${field.path}.${i}.${item.path}`;
    const shownItems = (row: FormValues) =>
      items.filter((it) => isFieldShown(it, row, items, values, rootFields));

    const addButton = canAdd ? (
      <Button type="button" variant="outline" size="sm" onClick={add} disabled={disabled}>
        <Plus className="w-4 h-4 mr-1" /> {field.addLabel || `Add ${field.itemLabel || 'Entry'}`}
      </Button>
    ) : null;

    const header = (
      <div className="flex items-center justify-between mb-3 gap-2">
        {hideLabel ? <span /> : (
          <div>
            <h4 className="font-semibold text-gray-800">
              {field.label} {(field.minFilled ?? 0) > 0 && <span className="text-red-500">*</span>}
            </h4>
            {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
          </div>
        )}
        {addButton}
      </div>
    );

    // --- Address history: the original compact one-line row ---------------
    if (field.widget === 'addressHistory') {
      const byId = (id: string) => items.find((it) => it.id === id && !it.hidden);
      const addr = byId('address.address');
      const type = byId('address.addressType');
      const years = byId('address.durationYears');
      const months = byId('address.durationMonths');
      const extras = items.filter((it) => !it.builtIn);
      return (
        <div className="mt-2">
          {header}
          <FieldError message={shownError(field.path)} />
          {rows.map((row, i) => {
            const durationError = shownError(`${field.path}.${i}.durationYears`) || shownError(`${field.path}.${i}.durationMonths`);
            return (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg relative">
                {addr && (
                  <div className="md:col-span-2">
                    <Label className="text-sm">{addr.label} {i + 1} {(addr.required || addr.displayRequired) && <span className="text-red-500">*</span>}</Label>
                    <Input
                      value={row.address ?? ''}
                      onChange={(e) => setValue(rowPath(i, addr), e.target.value)}
                      onBlur={() => onBlurPath(rowPath(i, addr))}
                      placeholder={addr.placeholder || ''}
                      disabled={disabled}
                      className={`mt-1 ${shownError(rowPath(i, addr)) ? 'border-red-500' : ''}`}
                    />
                    <FieldError message={shownError(rowPath(i, addr))} />
                  </div>
                )}
                {type && (
                  <div>
                    <Label className="text-sm">{type.label}</Label>
                    <select
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                      value={row.addressType || ''}
                      disabled={disabled}
                      onChange={(e) => setValue(rowPath(i, type), e.target.value)}
                    >
                      <option value="">Select</option>
                      {(type.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  {(years || months) && (
                    <div className="flex-1">
                      <Label className="text-sm">Duration of Stay</Label>
                      <div className="mt-1 flex gap-2 items-center">
                        {years && (
                          <>
                            <Input
                              type="number"
                              min={0}
                              value={row.durationYears ?? ''}
                              disabled={disabled}
                              onChange={(e) => setValue(rowPath(i, years), parseNumberInput(years, e.target.value))}
                              onBlur={() => onBlurPath(rowPath(i, years))}
                              placeholder="0"
                              className={`w-16 ${shownError(rowPath(i, years)) ? 'border-red-500' : ''}`}
                            />
                            <span className="text-sm text-gray-600">yrs</span>
                          </>
                        )}
                        {months && (
                          <>
                            <Input
                              type="number"
                              min={0}
                              max={11}
                              value={row.durationMonths ?? ''}
                              disabled={disabled}
                              onChange={(e) => setValue(rowPath(i, months), parseNumberInput(months, e.target.value))}
                              onBlur={() => onBlurPath(rowPath(i, months))}
                              placeholder="0"
                              className="w-16"
                            />
                            <span className="text-sm text-gray-600">mos</span>
                          </>
                        )}
                      </div>
                      <FieldError message={durationError} />
                    </div>
                  )}
                  {canRemove && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} className="text-red-500 mb-0.5" disabled={disabled}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {extras.length > 0 && (
                  <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-6 gap-3">
                    {extras.filter((it) => isFieldShown(it, row, items, values, rootFields)).map((it) => (
                      <div key={it.id} className={spanClass(it)}>
                        {renderSimple(it, rowPath(i, it), getPath(row, it.path), `f-${field.id}-${i}-${it.id}`, true)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // --- Gap details: rows derived from employment, not added by hand -------
    if (field.widget === 'gapDetails') {
      return (
        <div className="space-y-4">
          {rows.map((row, i) => (
            <div key={row.key || i} className="p-4 border rounded-lg space-y-3">
              <h4 className="font-semibold text-gray-800">{row.label}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shownItems(row).map((it) => (
                  <div key={it.id}>{renderSimple(it, rowPath(i, it), getPath(row, it.path), `f-gap-${row.key || i}-${it.id}`)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // --- Cards: employment, references, custom repeating sections -----------
    return (
      <div className="space-y-4">
        {header}
        <FieldError message={shownError(field.path)} />
        {rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">{field.emptyText || 'Nothing added yet.'}</p>
            {addButton}
          </div>
        )}
        {rows.map((row, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800">{field.itemLabel || 'Entry'} {i + 1}</h4>
              {canRemove && (
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} className="text-red-500" disabled={disabled}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {shownItems(row).map((it) => (
                <div key={it.id} className={spanClass(it)}>
                  {renderSimple(it, rowPath(i, it), getPath(row, it.path), `f-${field.id}-${i}-${it.id}`)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const visibleFields = (step.fields || []).filter((f) => isFieldShown(f, values, rootFields, values, rootFields));

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      {visibleFields.map((field) => (
        <div key={field.id} className={spanClass(field)}>
          {field.type === 'repeater'
            ? renderRepeater(field, field.label === (step.heading || step.title))
            : renderSimple(field, field.path, getPath(values, field.path), `f-${field.id}`)}
        </div>
      ))}
    </div>
  );

};

export default StepFields;
