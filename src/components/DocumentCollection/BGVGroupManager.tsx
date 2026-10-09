import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiService } from '@/services/api';
import { BGVFormConfig } from '@/types/customer';
import { BgvGroup } from '@/types/bgvGroup';
import { Users, Plus, Pencil, Trash2, AlertCircle, CheckCircle2, PencilRuler, Link2 } from 'lucide-react';
import FormBuilder from '@/components/BgvFormBuilder/FormBuilder';
import { BuilderOverlay } from '@/components/BgvFormBuilder/BgvFormCard';

interface BGVGroupManagerProps {
  customerId: string;
  companyName: string;
}

// Manages a company's BGV groups. A candidate assigned to a group gets the
// group's form: either the company form, or the group's own form edited in
// the form builder. Candidates on a group follow it live until they submit;
// anything that becomes required after they started stays optional for them.
const BGVGroupManager: React.FC<BGVGroupManagerProps> = ({ customerId, companyName }) => {
  const [groups, setGroups] = useState<BgvGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BgvGroup | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [builderGroup, setBuilderGroup] = useState<BgvGroup | null>(null);

  const flash = (message: string) => {
    setSavedMessage(message);
    setTimeout(() => setSavedMessage(null), 4000);
  };

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
    setSaveError(null);
    setEditorOpen(true);
  };

  const openEdit = (group: BgvGroup) => {
    setEditing(group);
    setName(group.name);
    setDescription(group.description || '');
    setSaveError(null);
    setEditorOpen(true);
  };

  const persist = async () => {
    if (!name.trim()) {
      setSaveError('Group name is required');
      return;
    }
    try {
      setSaving(true);
      setSaveError(null);
      const payload = { name: name.trim(), description: description.trim() };
      const response = editing
        ? await apiService.updateBgvGroup(editing._id, payload)
        // A new group uses the company form until its own form is edited.
        : await apiService.createBgvGroup({ customerId, ...payload, formTemplateMode: 'inherit' });

      if (!response.success) {
        setSaveError(response.message || 'Failed to save group');
        return;
      }
      setEditorOpen(false);
      flash(editing ? `Group "${name.trim()}" updated.` : `Group "${name.trim()}" created. It uses the company form until you edit its own.`);
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
      ? `\n\n${pending} candidate(s) are on this group. Those who have not submitted will keep the form they have now.`
      : '';
    if (!window.confirm(`Delete BGV group "${group.name}"?${warning}`)) return;

    try {
      const response = await apiService.deleteBgvGroup(group._id);
      if (!response.success) {
        setListError(response.message || 'Failed to delete group');
        return;
      }
      flash(`Group "${group.name}" deleted.`);
      await fetchGroups();
    } catch (error: any) {
      setListError(error.message || 'Failed to delete group');
    }
  };

  /** Open the builder on the group's own form, creating it from what it shows now if needed. */
  const editGroupForm = async (group: BgvGroup) => {
    if (group.formTemplateMode !== 'custom') {
      const from = group.formTemplateMode === 'inherit' ? 'the company form' : 'its current settings';
      if (!window.confirm(`Give "${group.name}" its own form?\n\nIt starts as a copy of ${from}, so nothing changes for its candidates until you edit and save it. Later changes to the company form will no longer apply to this group.`)) return;
      try {
        await apiService.setBgvGroupFormMode(group._id, 'custom');
        await fetchGroups();
      } catch (error: any) {
        setListError(error.message || 'Could not set up the group form');
        return;
      }
    }
    setBuilderGroup(group);
  };

  const switchToCompanyForm = async (group: BgvGroup) => {
    if (!window.confirm(`Switch "${group.name}" to the company form?\n\nCandidates on this group who have not submitted will see the company form. Anything newly required stays optional for those who already started. The group's own form is kept in its history.`)) return;
    try {
      await apiService.setBgvGroupFormMode(group._id, 'inherit');
      flash(`"${group.name}" now uses the company form.`);
      await fetchGroups();
    } catch (error: any) {
      setListError(error.message || 'Could not switch the group form');
    }
  };

  const classicSummary = (group: BgvGroup) => {
    const steps = group.config?.steps || ({} as BGVFormConfig['steps']);
    const off = Object.entries(steps).filter(([, on]) => on === false).map(([key]) => key);
    return off.length ? `Classic settings — excludes: ${off.join(', ')}` : 'Classic settings — all steps';
  };

  const formSummary = (group: BgvGroup) =>
    group.formTemplateMode === 'inherit' ? 'Uses the company form'
      : group.formTemplateMode === 'custom' ? 'Own form'
      : classicSummary(group);

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
              Ask different things of different candidates at {companyName}. Assign a group when adding a candidate.
              A group can use the company form or have its own. Candidates who have not submitted follow their
              group's form as it changes.
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
            No groups yet. Candidates use the company form above. Add a group when you need to ask different
            things of different candidates.
          </p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group._id} className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {group.description ? `${group.description} — ` : ''}
                    {formSummary(group)}
                  </p>
                </div>
                <span className="text-xs text-gray-500 shrink-0">
                  {group.candidateCount || 0} candidate{(group.candidateCount || 0) === 1 ? '' : 's'}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => editGroupForm(group)} title="Edit this group's form">
                  <PencilRuler className="h-3.5 w-3.5 mr-1" /> Form
                </Button>
                {group.formTemplateMode !== 'inherit' && (
                  <button
                    type="button"
                    onClick={() => switchToCompanyForm(group)}
                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Use the company form"
                  >
                    <Link2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(group)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Rename group"
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

      {/* Name / description */}
      <Dialog open={editorOpen} onOpenChange={(open) => !open && setEditorOpen(false)}>
        <DialogContent className="max-w-md">
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

            {!editing && (
              <p className="text-xs text-gray-500">
                The group starts on the company form. Use <strong>Form</strong> on the group to give it its own.
              </p>
            )}

            {saveError && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3" role="alert">
                <p className="text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {saveError}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={persist} disabled={saving}>
                {saving ? 'Saving...' : 'Save Group'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {builderGroup && (
        <BuilderOverlay>
          <FormBuilder
            ownerType="group"
            ownerId={builderGroup._id}
            ownerName={`${companyName} · ${builderGroup.name}`}
            onClose={() => { setBuilderGroup(null); fetchGroups(); }}
            onSaved={fetchGroups}
          />
        </BuilderOverlay>
      )}
    </Card>
  );
};

export default BGVGroupManager;
