import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { FieldKey } from './fields';

export interface PreviewCandidate {
  index: number;
  fields: Record<FieldKey, string>;
}

interface ExcelRowPreviewProps {
  candidates: PreviewCandidate[];
  headers: string[] | null;
  /** Map from FIELD_KEY → 0-indexed Excel column. Comes from the backend so it
   *  always matches the .xlsx layout produced by appendRowToExcel. */
  fieldKeyToColumn: Record<string, number> | null;
}

/**
 * Live preview of the rows that will be appended to the chosen Excel.
 * Re-renders on every keystroke in any candidate's field input because it
 * reads directly from the candidates state owned by ReviewForm.
 *
 * Order of columns is determined by the backend's EXCEL_HEADERS — never by
 * the frontend's FIELD_GROUPS (which only groups for UX, not Excel layout).
 */
const ExcelRowPreview: React.FC<ExcelRowPreviewProps> = ({ candidates, headers, fieldKeyToColumn }) => {
  if (!headers || !fieldKeyToColumn) {
    return (
      <div className="bg-white border rounded-lg p-4 text-xs text-gray-500">
        Loading Excel column layout…
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="bg-white border rounded-lg p-6 text-center text-sm text-gray-500">
        Nothing will be saved — all candidates are skipped or deleted.
      </div>
    );
  }

  // Inverse of fieldKeyToColumn so we can find the right field key for each
  // column index quickly.
  const columnToFieldKey: (string | undefined)[] = new Array(headers.length);
  for (const [key, colIdx] of Object.entries(fieldKeyToColumn)) {
    if (typeof colIdx === 'number' && colIdx >= 0 && colIdx < headers.length) {
      columnToFieldKey[colIdx] = key;
    }
  }

  const renderCell = (cand: PreviewCandidate, colIdx: number) => {
    const fieldKey = columnToFieldKey[colIdx];
    if (!fieldKey) return <span className="text-gray-300">—</span>;
    const v = cand.fields[fieldKey as FieldKey];
    if (v == null || v.trim() === '') return <span className="text-gray-300">—</span>;
    return <span className="text-gray-900">{v}</span>;
  };

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50">
        <FileSpreadsheet className="h-4 w-4 text-green-600" />
        <div className="text-sm font-semibold text-gray-900">
          Excel preview — {candidates.length} row{candidates.length === 1 ? '' : 's'} will be saved
        </div>
        <div className="ml-auto text-[11px] text-gray-500">
          {headers.length} columns · live updates as you edit
        </div>
      </div>
      <div className="overflow-x-auto max-h-72">
        <table className="text-xs">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 border-r border-gray-200 z-10">
                #
              </th>
              {headers.map((h, i) => (
                <th
                  key={`${i}-${h}`}
                  className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                  title={h}
                >
                  {h.trim() || '(blank)'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((cand, rIdx) => (
              <tr key={cand.index} className="border-t border-gray-100">
                <td className="px-2 py-2 sticky left-0 bg-white border-r border-gray-200 text-gray-500 z-10 font-medium">
                  {rIdx + 1}
                </td>
                {headers.map((_, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-3 py-2 whitespace-nowrap max-w-[280px] truncate border-r border-gray-100 last:border-r-0"
                  >
                    {renderCell(cand, colIdx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExcelRowPreview;
