import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { TemplateDocument } from '@/lib/bgvForm/types';
import { createDocument, move } from './builderUtils';

// Documents the candidate uploads on the last step.

interface DocumentsEditorProps {
  documents: TemplateDocument[];
  employmentShown: boolean;
  onChange: (documents: TemplateDocument[]) => void;
}

const DocumentsEditor: React.FC<DocumentsEditorProps> = ({ documents, employmentShown, onChange }) => {
  const update = (i: number, patch: Partial<TemplateDocument>) =>
    onChange(documents.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">Documents</h4>
          <p className="text-xs text-gray-500">PDF, JPG or PNG, up to 5MB each. Uploaded on the last step.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...documents, createDocument()])}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add document
        </Button>
      </div>

      {documents.map((doc, i) => {
        const perEmployment = doc.type === 'perEmployment';
        return (
          <div key={doc.id} className={`rounded-md border border-gray-200 p-3 space-y-2 bg-white ${doc.hidden ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2">
              <Input
                className="h-8 text-sm flex-1"
                value={doc.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Document name"
              />
              <span className="text-[11px] text-gray-400 shrink-0">{doc.builtIn ? 'standard' : 'custom'}</span>
              <button type="button" className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={i === 0} onClick={() => onChange(move(documents, i, -1))} title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" disabled={i === documents.length - 1} onClick={() => onChange(move(documents, i, 1))} title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" className="p-1 text-gray-400 hover:text-gray-700" onClick={() => update(i, { hidden: !doc.hidden })} title={doc.hidden ? 'Show' : 'Hide'}>
                {doc.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              {!doc.builtIn && (
                <button type="button" className="p-1 text-gray-400 hover:text-red-600" onClick={() => onChange(documents.filter((_, idx) => idx !== i))} title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>

            {perEmployment ? (
              <>
                <p className="text-xs text-gray-500">
                  One card per employment entry{employmentShown ? '' : ' — not shown while the Employment step is hidden'}.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(doc.subDocs || []).map((sd, j) => (
                    <div key={sd.key} className="flex items-center gap-1">
                      <Input
                        className="h-8 text-sm"
                        value={sd.label}
                        onChange={(e) => update(i, { subDocs: (doc.subDocs || []).map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })}
                      />
                      <button
                        type="button"
                        className="p-1 text-gray-400 hover:text-gray-700"
                        title={sd.hidden ? 'Show' : 'Hide'}
                        onClick={() => update(i, { subDocs: (doc.subDocs || []).map((x, k) => (k === j ? { ...x, hidden: !x.hidden } : x)) })}
                      >
                        {sd.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
                <Input className="h-8 text-sm" placeholder="Instructions" value={doc.helpText || ''} onChange={(e) => update(i, { helpText: e.target.value })} />
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input className="h-8 text-sm" placeholder={`Name in the invitation email (${doc.label})`} value={doc.checklistLabel || ''} onChange={(e) => update(i, { checklistLabel: e.target.value })} />
                <Input className="h-8 text-sm" placeholder="Instructions (optional)" value={doc.helpText || ''} onChange={(e) => update(i, { helpText: e.target.value })} />
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="h-4 w-4" checked={doc.required !== false} onChange={(e) => update(i, { required: e.target.checked })} />
              {perEmployment ? 'At least one is required for each employment' : 'Required'}
            </label>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentsEditor;
