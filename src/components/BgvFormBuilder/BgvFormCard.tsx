import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, PencilRuler } from 'lucide-react';
import { apiService } from '@/services/api';
import { CurrentForm, TemplateVersionSummary, buildRequirementListFromTemplate } from '@/lib/bgvForm/types';
import FormBuilder from './FormBuilder';

// Company-level BGV form summary, with the entry point to the form builder.
// Replaces the old step/document toggle editor (BGVFormConfigEditor).

interface BgvFormCardProps {
  customerId: string;
  companyName: string;
  /** Called after a save, so lists that depend on the form can refresh. */
  onFormSaved?: () => void;
}

/** Full-screen surface for the builder; the builder owns closing (it checks for unsaved changes). */
export const BuilderOverlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 bg-black/60 p-2 sm:p-4" role="dialog" aria-modal="true">
    <div className="h-full w-full bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">{children}</div>
  </div>
);

const BgvFormCard: React.FC<BgvFormCardProps> = ({ customerId, companyName, onFormSaved }) => {
  const [current, setCurrent] = useState<CurrentForm | null>(null);
  const [latest, setLatest] = useState<TemplateVersionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getBgvFormTemplate('company', customerId);
      setCurrent(response.data.current);
      setLatest(response.data.versions?.[0] || null);
    } catch (e: any) {
      setError(e.message || 'Could not load the form');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => { if (customerId) load(); }, [customerId, load]);

  const checklist = current ? buildRequirementListFromTemplate(current.definition) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              BGV Form
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              The form candidates of {companyName} fill in. Change labels, add or hide fields and steps,
              and set validation. Groups can use this form or have their own.
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => setBuilderOpen(true)} disabled={loading || !!error} className="shrink-0">
            <PencilRuler className="h-4 w-4 mr-1" /> Edit form
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500">Loading form…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : current && checklist ? (
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              {current.version
                ? <>Version {current.version}{latest ? <> · saved {new Date(latest.createdAt).toLocaleDateString('en-IN')}{latest.createdBy?.name ? ` by ${latest.createdBy.name}` : ''}</> : null}</>
                : 'Standard form (not customised yet)'}
            </p>
            <ol className="list-decimal pl-5 text-gray-700 space-y-0.5">
              {checklist.items.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </div>
        ) : null}
      </CardContent>

      {builderOpen && (
        <BuilderOverlay>
          <FormBuilder
            ownerType="company"
            ownerId={customerId}
            ownerName={companyName}
            onClose={() => { setBuilderOpen(false); load(); }}
            onSaved={() => { load(); onFormSaved?.(); }}
          />
        </BuilderOverlay>
      )}
    </Card>
  );
};

export default BgvFormCard;
