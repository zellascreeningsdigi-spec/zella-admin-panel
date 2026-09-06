import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiService } from '@/services/api';
import { BGVFormConfig, DEFAULT_BGV_FORM_CONFIG } from '@/types/customer';
import { BgvGroup, BgvGroupImpact } from '@/types/bgvGroup';
import BGVConfigFields from './BGVConfigFields';
import { Users, Plus, Pencil, Trash2, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface BGVGroupManagerProps {
  customerId: string;
  companyName: string;
}

// Manages a company's BGV config groups: named config presets that a candidate
// can be assigned at creation. A candidate on a group resolves their form
// config from it live until they submit, so editing a group changes the form
// for candidates who have not submitted yet -- hence the impact warning.
const BGVGroupManager: React.FC<BGVGroupManagerProps> = ({ customerId, companyName }) => {
  const [groups, setGroups] = useState<BgvGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BgvGroup | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [config, setConfig] = useState<BGVFormConfig>(DEFAULT_BGV_FORM_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [impact, setImpact] = useState<BgvGroupImpact | null>(null);
  const [checkingImpact, setCheckingImpact] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setListError(null);
      const response = await apiService.getBgvGroups(customerId);
      if (response.success) {
        setGroups((response.data as BgvGroup[]) || []);
      } else {
        setListError(response.message || 'Failed to load groups');
      }
    } catch (error: any) {
      setListError(error.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (customerId) fetchGroups();
  }, [customerId, fetchGroups]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    // A new group starts from the full default rather than a blank slate, so an
    // admin turns things off rather than having to remember to turn them on.
    setConfig(DEFAULT_BGV_FORM_CONFIG);
    setSaveError(null);
    setImpact(null);
    setEditorOpen(true);
  };

  const openEdit = (group: BgvGroup) => {
    setEditing(group);
    setName(group.name);
    setDescription(group.description || '');
    setConfig({
      steps: { ...DEFAULT_BGV_FORM_CONFIG.steps, ...(group.config?.steps || {}) },
      documentTypes: {
        ...DEFAULT_BGV_FORM_CONFIG.documentTypes,
        ...(group.config?.documentTypes || {}),
      },
      customDocumentTypes: group.config?.customDocumentTypes || [],
    });
    setSaveError(null);
    setImpact(null);
    setEditorOpen(true);
  };

  // Ask the server what this change would do before committing it. Only
  // meaningful when editing: a brand new group has no candidates yet.
  const handleSaveClick = async () => {
    if (!name.trim()) {
      setSaveError('Group name is required');
      return;
    }
    if (!editing) {
      await persist();
      return;
    }

    try {
      setCheckingImpact(true);
      setSaveError(null);
      const response = await apiService.getBgvGroupImpact(editing._id, config);
      const summary = response.success ? (response.data as BgvGroupImpact) : null;

      // Only interrupt when a candidate has actually entered something that
      // this change would hide. Otherwise save straight through.
      if (summary && (summary.startedCount > 0 || summary.dataAtRisk.length > 0)) {
        setImpact(summary);
      } else {
        await persist();
      }
    } catch (error: any) {
      setSaveError(error.message || 'Failed to check impact');
    } finally {
      setCheckingImpact(false);
    }
  };

  const persist = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      const payload = { name: name.trim(), description: description.trim(), config };
      const response = editing
        ? await apiService.updateBgvGroup(editing._id, payload)
        : await apiService.createBgvGroup({ customerId, ...payload });

      if (!response.success) {
        setSaveError(response.message || 'Failed to save group');
        return;
      }

      setImpact(null);
      setEditorOpen(false);
      setSavedMessage(editing ? `Group "${name.trim()}" updated.` : `Group "${name.trim()}" created.`);
      setTimeout(() => setSavedMessage(null), 4000);
      await fetchGroups();
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group: BgvGroup) => {
    const pending = group.candidateCount || 0;
    const warning = pending > 0
      ? `\n\n${pending} candidate(s) are on this group. Those who have not submitted will keep their current config.`
      : '';
    if (!window.confirm(`Delete BGV group "${group.name}"?${warning}`)) return;

    try {
      const response = await apiService.deleteBgvGroup(group._id);
      if (!response.success) {
        setListError(response.message || 'Failed to delete group');
        return;
      }
      setSavedMessage(`Group "${group.name}" deleted.`);
      setTimeout(() => setSavedMessage(null), 4000);
      await fetchGroups();
    } catch (error: any) {
      setListError(error.message || 'Failed to delete group');
    }
  };

  const disabledSteps = (group: BgvGroup) => {
    const steps = group.config?.steps || ({} as BGVFormConfig['steps']);
    const off = Object.entries(steps)
      .filter(([, on]) => on === false)
      .map(([key]) => key);
    return off.length ? `Excludes: ${off.join(', ')}` : 'All steps included';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              BGV Groups
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Named BGV configs for {companyName}. Assign a group when adding a candidate to send
              a link with that config. Editing a group updates the form for candidates who have
              not submitted yet.
            </p>
          </div>
          <Button type="button" size="sm" onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add Group
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {savedMessage && (
          <div className="mb-4 rounded-md border border-green-300 bg-green-50 p-3">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {savedMessage}
            </p>
          </div>
        )}

        {listError && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3" role="alert">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {listError}
            </p>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading groups...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-500">
            No groups yet. Candidates use the company default config above. Add a group when you
            need to ask different things of different candidates.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group._id}
                className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {group.description ? `${group.description} — ` : ''}
                    {disabledSteps(group)}
                  </p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {group.candidateCount || 0} candidate{(group.candidateCount || 0) === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(group)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit group"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(group)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete group"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Group editor */}
      <Dialog open={editorOpen} onOpenChange={(open) => !open && setEditorOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit "${editing.name}"` : 'New BGV Group'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bgv-group-name">
                Group Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bgv-group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Interns, Senior Engineers"
              />
            </div>

            <div>
              <Label htmlFor="bgv-group-description">Description</Label>
              <Input
                id="bgv-group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional — what this group is for"
              />
            </div>

            <BGVConfigFields config={config} onChange={setConfig} disabled={saving} />

            {saveError && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3" role="alert">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {saveError}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditorOpen(false)}
                disabled={saving || checkingImpact}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveClick} disabled={saving || checkingImpact}>
                {checkingImpact ? 'Checking...' : saving ? 'Saving...' : 'Save Group'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Impact warning: shown only when a change would hide data candidates
          have already entered. */}
      <Dialog open={!!impact} onOpenChange={(open) => !open && setImpact(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Apply this change?
            </DialogTitle>
          </DialogHeader>

          {impact && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">{impact.pendingCount}</span> pending candidate
                {impact.pendingCount === 1 ? '' : 's'} will get the new config.
              </p>

              {impact.startedCount > 0 && (
                <p className="text-sm text-amber-700">
                  <span className="font-medium">{impact.startedCount}</span> of them ha
                  {impact.startedCount === 1 ? 's' : 've'} already started filling the form.
                </p>
              )}

              {impact.dataAtRisk.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-800 mb-1">
                    Turning these steps off will hide data already entered:
                  </p>
                  <ul className="text-xs text-amber-800 list-disc pl-4 space-y-0.5">
                    {impact.dataAtRisk.map((risk) => (
                      <li key={risk.step}>
                        {risk.label}: {risk.entries} entr{risk.entries === 1 ? 'y' : 'ies'} across{' '}
                        {risk.candidates} candidate{risk.candidates === 1 ? '' : 's'}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-700 mt-2">
                    The data is hidden, not deleted. Re-enabling the step brings it back.
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Candidates who have already submitted are not affected.
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setImpact(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={persist} disabled={saving}>
                  {saving ? 'Applying...' : 'Apply anyway'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BGVGroupManager;
