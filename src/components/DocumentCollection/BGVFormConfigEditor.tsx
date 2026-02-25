import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';
import { BGVFormConfig, DEFAULT_BGV_FORM_CONFIG, CustomDocumentType } from '@/types/customer';
import { Settings, Save, Plus, Trash2 } from 'lucide-react';

interface BGVFormConfigEditorProps {
  customerId: string;
  companyName: string;
  onConfigUpdated?: () => void;
}

const STEP_LABELS: { key: keyof BGVFormConfig['steps']; label: string }[] = [
  { key: 'education', label: 'Education' },
  { key: 'employment', label: 'Employment' },
  { key: 'references', label: 'References' },
  { key: 'gapDetails', label: 'Gap Details' },
];

const DOC_TYPE_LABELS: { key: keyof BGVFormConfig['documentTypes']; label: string }[] = [
  { key: 'aadhaar', label: 'Aadhaar Card' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'degreeMarksheet', label: 'Degree / Marksheet' },
  { key: 'addressProof', label: 'Address Proof' },
  { key: 'passport', label: 'Passport' },
  { key: 'passportDeclaration', label: 'Passport Declaration' },
  { key: 'relievingLetter', label: 'Relieving Letter' },
  { key: 'paySlip', label: 'Pay Slip' },
  { key: 'offerLetter', label: 'Offer Letter' },
  { key: 'cv', label: 'CV / Resume' },
  { key: 'signature', label: 'Signature' },
];

const BUILT_IN_DOC_KEYS = DOC_TYPE_LABELS.map(d => d.key as string);

function toCamelCaseKey(label: string): string {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

const BGVFormConfigEditor: React.FC<BGVFormConfigEditorProps> = ({
  customerId,
  companyName,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<BGVFormConfig>(DEFAULT_BGV_FORM_CONFIG);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCustomLabel, setNewCustomLabel] = useState('');

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setLoading(true);
        const response = await apiService.getCustomerById(customerId);
        if (response.success && response.data) {
          const customer = response.data.customer;
          if (customer.bgvFormConfig) {
            setConfig({
              steps: { ...DEFAULT_BGV_FORM_CONFIG.steps, ...customer.bgvFormConfig.steps },
              documentTypes: { ...DEFAULT_BGV_FORM_CONFIG.documentTypes, ...customer.bgvFormConfig.documentTypes },
              customDocumentTypes: customer.bgvFormConfig.customDocumentTypes || [],
            });
          } else {
            setConfig(DEFAULT_BGV_FORM_CONFIG);
          }
        }
      } catch (error) {
        console.error('Failed to fetch customer config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [customerId]);

  const handleStepChange = (key: keyof BGVFormConfig['steps'], checked: boolean) => {
    setConfig(prev => {
      const newSteps = { ...prev.steps, [key]: checked };
      // Auto-disable gapDetails when employment is off
      if (key === 'employment' && !checked) {
        newSteps.gapDetails = false;
      }
      return { ...prev, steps: newSteps };
    });
  };

  const handleDocTypeChange = (key: keyof BGVFormConfig['documentTypes'], checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      documentTypes: { ...prev.documentTypes, [key]: checked },
    }));
  };

  const handleAddCustomDocType = () => {
    const label = newCustomLabel.trim();
    if (!label) return;
    const key = toCamelCaseKey(label);
    if (!key) return;
    // Check for duplicates against built-in and existing custom keys
    const existingCustomKeys = (config.customDocumentTypes || []).map(ct => ct.key);
    if (BUILT_IN_DOC_KEYS.includes(key) || existingCustomKeys.includes(key)) {
      alert(`A document type with key "${key}" already exists.`);
      return;
    }
    setConfig(prev => ({
      ...prev,
      customDocumentTypes: [...(prev.customDocumentTypes || []), { key, label, enabled: true }],
    }));
    setNewCustomLabel('');
  };

  const handleRemoveCustomDocType = (key: string) => {
    setConfig(prev => ({
      ...prev,
      customDocumentTypes: (prev.customDocumentTypes || []).filter(ct => ct.key !== key),
    }));
  };

  const handleCustomDocTypeToggle = (key: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      customDocumentTypes: (prev.customDocumentTypes || []).map(ct =>
        ct.key === key ? { ...ct, enabled: checked } : ct
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiService.updateCustomer(customerId, { bgvFormConfig: config });
      if (response.success) {
        alert('BGV form configuration saved successfully!');
        onConfigUpdated?.();
      } else {
        alert('Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Save config error:', error);
      alert(error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            BGV Form Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          BGV Form Configuration
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Configure which steps and document types are required for this company's BGV forms.
          Changes only affect newly created collections.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Steps */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Form Steps</h4>
          <p className="text-xs text-gray-500 mb-3">Personal Info and LOA are always required and cannot be disabled.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STEP_LABELS.map(({ key, label }) => {
              const isGapDetailsDisabled = key === 'gapDetails' && !config.steps.employment;
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2 cursor-pointer ${isGapDetailsDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Checkbox
                    checked={config.steps[key]}
                    onCheckedChange={(checked) => handleStepChange(key, !!checked)}
                    disabled={isGapDetailsDisabled}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              );
            })}
          </div>
          {!config.steps.employment && (
            <p className="text-xs text-amber-600 mt-2">Gap Details is auto-disabled when Employment is off.</p>
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
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Document Types */}
        <div>
          <h4 className="font-semibold text-gray-800 mb-3">Custom Document Types</h4>
          <p className="text-xs text-gray-500 mb-3">Add company-specific document types (e.g., Drug Test Report, Police Verification).</p>

          {(config.customDocumentTypes || []).length > 0 && (
            <div className="space-y-2 mb-4">
              {(config.customDocumentTypes || []).map((ct: CustomDocumentType) => (
                <div key={ct.key} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <Checkbox
                    checked={ct.enabled}
                    onCheckedChange={(checked) => handleCustomDocTypeToggle(ct.key, !!checked)}
                  />
                  <span className="text-sm text-gray-700 flex-1">{ct.label}</span>
                  <span className="text-xs text-gray-400 font-mono">{ct.key}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomDocType(ct.key)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDocType(); } }}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCustomDocType}
              disabled={!newCustomLabel.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BGVFormConfigEditor;
