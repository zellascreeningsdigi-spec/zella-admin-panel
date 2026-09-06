import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { BGVFormConfig, CustomDocumentType } from '@/types/customer';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

// The step/document toggles shared by the company-level config editor and the
// per-group config editor. Presentational only: it owns no saving, no fetching
// and no notion of what the config belongs to, so both editors can drive it.
//
// Extracted rather than duplicated because the codebase already carries three
// copies of BGV label/enablement logic (documentCollectionService.js:22-42,
// lib/bgvRequirements.ts:5-25, and this list). A fourth was not worth adding.

export const STEP_LABELS: { key: keyof BGVFormConfig['steps']; label: string }[] = [
  { key: 'education', label: 'Education' },
  { key: 'employment', label: 'Employment' },
  { key: 'references', label: 'References' },
  { key: 'gapDetails', label: 'Gap Details' },
];

export const DOC_TYPE_LABELS: { key: keyof BGVFormConfig['documentTypes']; label: string }[] = [
  { key: 'aadhaar', label: 'Aadhaar Card' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'degreeMarksheet', label: 'Degree / Marksheet' },
  { key: 'addressProof', label: 'Address Proof' },
  { key: 'passport', label: 'Passport' },
  { key: 'passportDeclaration', label: 'Passport Declaration' },
  { key: 'cv', label: 'CV / Resume' },
  { key: 'signature', label: 'Signature' },
];

export const BUILT_IN_DOC_KEYS = DOC_TYPE_LABELS.map((d) => d.key as string);

export function toCamelCaseKey(label: string): string {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join('');
}

interface BGVConfigFieldsProps {
  config: BGVFormConfig;
  onChange: (config: BGVFormConfig) => void;
  disabled?: boolean;
}

const BGVConfigFields: React.FC<BGVConfigFieldsProps> = ({ config, onChange, disabled }) => {
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const handleStepChange = (key: keyof BGVFormConfig['steps'], value: boolean) => {
    const steps = { ...config.steps, [key]: value };
    // Gap details are derived from employment periods, so they cannot stand on
    // their own. The backend enforces the same rule.
    if (key === 'employment' && !value) steps.gapDetails = false;
    onChange({ ...config, steps });
  };

  const handleDocTypeChange = (key: keyof BGVFormConfig['documentTypes'], value: boolean) => {
    onChange({ ...config, documentTypes: { ...config.documentTypes, [key]: value } });
  };

  const handleAddCustomDocType = () => {
    const label = newCustomLabel.trim();
    if (!label) return;

    const key = toCamelCaseKey(label);
    if (!key) {
      setDuplicateError('Enter a name containing letters or numbers.');
      return;
    }
    const existing = config.customDocumentTypes || [];
    if (BUILT_IN_DOC_KEYS.includes(key) || existing.some((ct) => ct.key === key)) {
      setDuplicateError(`"${label}" already exists.`);
      return;
    }

    setDuplicateError(null);
    setNewCustomLabel('');
    onChange({
      ...config,
      customDocumentTypes: [...existing, { key, label, enabled: true }],
    });
  };

  const handleCustomDocTypeToggle = (key: string, enabled: boolean) => {
    onChange({
      ...config,
      customDocumentTypes: (config.customDocumentTypes || []).map((ct) =>
        ct.key === key ? { ...ct, enabled } : ct
      ),
    });
  };

  const handleRemoveCustomDocType = (key: string) => {
    onChange({
      ...config,
      customDocumentTypes: (config.customDocumentTypes || []).filter((ct) => ct.key !== key),
    });
  };

  return (
    <div className="space-y-6">
      {/* Form Steps */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Form Steps</h4>
        <p className="text-xs text-gray-500 mb-3">
          Personal Info and LOA are always required and cannot be disabled.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STEP_LABELS.map(({ key, label }) => {
            const isGapDetailsDisabled = key === 'gapDetails' && !config.steps.employment;
            return (
              <label
                key={key}
                className={`flex items-center gap-2 cursor-pointer ${
                  isGapDetailsDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Checkbox
                  checked={config.steps[key]}
                  onCheckedChange={(checked) => handleStepChange(key, !!checked)}
                  disabled={disabled || isGapDetailsDisabled}
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            );
          })}
        </div>
        {!config.steps.employment && (
          <p className="text-xs text-amber-600 mt-2">
            Gap Details is auto-disabled when Employment is off.
          </p>
        )}
      </div>

      {/* Document Types */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Document Types</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {DOC_TYPE_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={config.documentTypes[key]}
                onCheckedChange={(checked) => handleDocTypeChange(key, !!checked)}
                disabled={disabled}
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Document Types */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-3">Custom Document Types</h4>
        <p className="text-xs text-gray-500 mb-3">
          Add company-specific document types (e.g., Drug Test Report, Police Verification).
        </p>

        {(config.customDocumentTypes || []).length > 0 && (
          <div className="space-y-2 mb-4">
            {(config.customDocumentTypes || []).map((ct: CustomDocumentType) => (
              <div key={ct.key} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <Checkbox
                  checked={ct.enabled}
                  onCheckedChange={(checked) => handleCustomDocTypeToggle(ct.key, !!checked)}
                  disabled={disabled}
                />
                <span className="text-sm text-gray-700 flex-1">{ct.label}</span>
                <span className="text-xs text-gray-400 font-mono">{ct.key}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCustomDocType(ct.key)}
                  disabled={disabled}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Remove custom type"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter custom document type name..."
            value={newCustomLabel}
            onChange={(e) => setNewCustomLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomDocType();
              }
            }}
            disabled={disabled}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomDocType}
            disabled={disabled || !newCustomLabel.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {duplicateError && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {duplicateError}
          </p>
        )}
      </div>
    </div>
  );
};

export default BGVConfigFields;
