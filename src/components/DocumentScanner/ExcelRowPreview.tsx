import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { FieldKey, FlatFieldKey, EmploymentFieldKey, EMPLOYMENT_FIELD_KEYS } from './fields';

export interface PreviewEmployment {
  fields: Record<EmploymentFieldKey, string>;
}

export interface PreviewCandidate {
  index: number;
  fields: Record<FlatFieldKey, string>;
  employments: PreviewEmployment[];
}

interface ExcelRowPreviewProps {
  candidates: PreviewCandidate[];
  headers: string[] | null;
  /** Map from FIELD_KEY → 0-indexed Excel column. Comes from the backend so it
   *  always matches the .xlsx layout produced by appendRowToExcel. */
  fieldKeyToColumn: Record<string, number> | null;
}

interface PreviewRow {
  candidateIndex: number;
  /** 1-based sub-index when a candidate fans out into N rows. */
  employmentOrdinal: number;
  /** Total number of rows this candidate produces — used to render `#1.1 / 2`. */
  employmentTotal: number;
  /** Resolved string value per FIELD_KEY for THIS row (employment columns vary). */
  fieldValues: Record<string, string>;
}

const EMP_KEY_SET = new Set<string>(EMPLOYMENT_FIELD_KEYS);

/**
 * Live preview of the rows that will be appended to the chosen Excel.
 * Re-renders on every keystroke because it reads directly from the state
 * owned by ReviewForm.
 *
 * Multi-employment fan-out: a candidate with N employments produces N rows
 * sharing flat columns, differing only in employment columns. Matches the
 * backend's `candidateToRows` semantics exactly.
 *
 * Column order is determined by the backend's EXCEL_HEADERS — never by the
 * frontend's FIELD_GROUPS (which only groups for UX, not Excel layout).
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

  // Inverse map: column index → field key.
  const columnToFieldKey: (string | undefined)[] = new Array(headers.length);
  for (const [key, colIdx] of Object.entries(fieldKeyToColumn)) {
    if (typeof colIdx === 'number' && colIdx >= 0 && colIdx < headers.length) {
      columnToFieldKey[colIdx] = key;
    }
  }

  // Flatten candidates → rows. One row per employment entry (or one row with
  // empty employment columns if the candidate has zero entries).
  const rows: PreviewRow[] = [];
  for (const cand of candidates) {
    const employmentTotal = cand.employments.length || 1;
    if (cand.employments.length === 0) {
      // Single empty-employment row — flat values only.
      const fieldValues: Record<string, string> = {};
      for (const [key] of Object.entries(fieldKeyToColumn)) {
        fieldValues[key] = (cand.fields as any)[key] ?? '';
      }
      rows.push({
        candidateIndex: cand.index,
        employmentOrdinal: 1,
        employmentTotal: 1,
        fieldValues
      });
    } else {
      cand.employments.forEach((emp, eIdx) => {
        const fieldValues: Record<string, string> = {};
        for (const [key] of Object.entries(fieldKeyToColumn)) {
          if (EMP_KEY_SET.has(key)) {
            fieldValues[key] = (emp.fields as any)[key] ?? '';
          } else {
            fieldValues[key] = (cand.fields as any)[key] ?? '';
          }
        }
        rows.push({
          candidateIndex: cand.index,
          employmentOrdinal: eIdx + 1,
          employmentTotal,
          fieldValues
        });
      });
    }
  }

  const renderCell = (row: PreviewRow, colIdx: number) => {
    const fieldKey = columnToFieldKey[colIdx];
    if (!fieldKey) return <span className="text-gray-300">—</span>;
    const v = row.fieldValues[fieldKey];
    if (v == null || v.trim() === '') return <span className="text-gray-300">—</span>;
    return <span className="text-gray-900">{v}</span>;
  };

  // Group rows per candidate so the index pill can show `#cIdx.empIdx`.
  let candidateOrdinal = 0;
  let lastCandidateIndex: number | null = null;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-gray-50">
        <FileSpreadsheet className="h-4 w-4 text-green-600" />
        <div className="text-sm font-semibold text-gray-900">
          Excel preview — {rows.length} row{rows.length === 1 ? '' : 's'} will be saved
          {candidates.length !== rows.length && (
            <span className="font-normal text-gray-500"> ({candidates.length} candidate{candidates.length === 1 ? '' : 's'})</span>
          )}
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
            {rows.map((row, rIdx) => {
              if (row.candidateIndex !== lastCandidateIndex) {
                candidateOrdinal++;
                lastCandidateIndex = row.candidateIndex;
              }
              const indexPill = row.employmentTotal === 1
                ? `#${candidateOrdinal}`
                : `#${candidateOrdinal}.${row.employmentOrdinal}`;
              return (
                <tr key={rIdx} className="border-t border-gray-100">
                  <td className="px-2 py-2 sticky left-0 bg-white border-r border-gray-200 text-gray-500 z-10 font-medium whitespace-nowrap">
                    {indexPill}
                  </td>
                  {headers.map((_, colIdx) => (
                    <td
                      key={colIdx}
                      className="px-3 py-2 whitespace-nowrap max-w-[280px] truncate border-r border-gray-100 last:border-r-0"
                    >
                      {renderCell(row, colIdx)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExcelRowPreview;
