import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Archive, ListPlus } from 'lucide-react';
import {
  FormTemplate,
  OrphanedAnswer,
  TemplateField,
  getPath,
  hasContent,
  isFieldShown,
  isStepVisible,
  rootFieldList,
} from '@/lib/bgvForm/types';

// Admin views of answers the standard sections don't show: form-builder
// fields, and answers to fields that have since been removed or hidden.

const isCustom = (f: TemplateField) => typeof f.path === 'string' && f.path.startsWith('custom.');

const formatAnswer = (field: TemplateField | null, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  const opt = (v: unknown) => field?.options?.find((o) => String(o.value) === String(v))?.label ?? String(v);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map(opt).join(', ') : '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return field && ['dropdown', 'radio'].includes(field.type) ? opt(value) : String(value);
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <Label className="text-gray-600 text-sm font-medium">{label}</Label>
    <p className="text-base mt-1 whitespace-pre-line break-words">{value}</p>
  </div>
);

interface Section {
  title: string;
  rows: { label: string; value: string }[];
}

/** Sections of custom answers, in form order. */
export const customAnswerSections = (template: FormTemplate, formData: Record<string, any>): Section[] => {
  const sections: Section[] = [];
  const rootFields = rootFieldList(template);
  const answer = (fields: TemplateField[], values: Record<string, any>) =>
    fields
      .filter((f) => isCustom(f) && !['info', 'file', 'repeater'].includes(f.type))
      .filter((f) => isFieldShown(f, values, fields, formData, rootFields))
      .map((f) => ({ label: f.label, value: formatAnswer(f, getPath(values, f.path)) }));

  for (const step of template.steps) {
    if (!isStepVisible(template, step) || step.type === 'documents') continue;
    const rows = answer(step.fields, formData);
    if (rows.length) sections.push({ title: step.builtIn ? `${step.heading || step.title} — additional` : (step.heading || step.title), rows });

    for (const field of step.fields) {
      if (field.type !== 'repeater' || field.hidden) continue;
      const items = field.itemFields || [];
      if (!items.some(isCustom)) continue;
      const entries: Record<string, any>[] = Array.isArray(getPath(formData, field.path)) ? getPath(formData, field.path) : [];
      entries.forEach((row, i) => {
        if (!hasContent(row)) return;
        const entryRows = answer(items, row);
        if (entryRows.length) sections.push({ title: `${field.itemLabel || field.label} ${i + 1}${isCustom(field) ? '' : ' — additional'}`, rows: entryRows });
      });
    }
  }
  return sections;
};

export const CustomAnswersCard: React.FC<{ template: FormTemplate; formData: Record<string, any> }> = ({ template, formData }) => {
  const sections = customAnswerSections(template, formData || {});
  if (sections.length === 0) return null;
  return (
    <Card>
      <CardHeader className="bg-teal-50 border-b border-teal-200">
        <CardTitle className="flex items-center gap-2"><ListPlus className="w-5 h-5 text-teal-600" /> Additional Information</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {sections.map((section, i) => (
          <div key={i}>
            <h4 className="font-semibold text-gray-800 mb-3">{section.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {section.rows.map((r, j) => <Row key={j} label={r.label} value={r.value} />)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const OrphanedAnswersCard: React.FC<{ answers?: OrphanedAnswer[] }> = ({ answers }) => {
  if (!answers || answers.length === 0) return null;
  return (
    <Card>
      <details>
        <summary className="cursor-pointer list-none">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Archive className="w-5 h-5 text-gray-500" /> Answers to fields no longer on the form ({answers.length})
            </CardTitle>
            <p className="text-xs text-gray-500">The candidate entered these before the form changed. They are kept for reference.</p>
          </CardHeader>
        </summary>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {answers.map((a) => <Row key={a.path} label={a.label} value={formatAnswer(null, a.value)} />)}
          </div>
        </CardContent>
      </details>
    </Card>
  );
};
