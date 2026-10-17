import React, { useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Month-by-month report, in the columns of the team's "OOCs - Tracker" sheet.
// Received = by start date; reports sent = by report date. A criminal case is
// one with only Criminal / Police Verification checks; every other case is a
// full case. WIP = still open and not in Insuff; WIP (YTD) restarts each January.

export interface MonthlyRow {
  month: string;
  wip: number;
  wipYtd: number;
  fullInsuff: number;
  criminalWip: number;
  received: number;
  receivedCriminal: number;
  reportedCriminal: number;
  receivedFull: number;
  reportedFull: number;
  reported: number;
}

const COLUMNS: { key: keyof MonthlyRow; label: string; tone: string; hint: string }[] = [
  { key: 'wip', label: 'WIP (MTD)', tone: 'bg-gray-50', hint: 'Received this month, still open, not in Insuff' },
  { key: 'wipYtd', label: 'WIP (YTD)', tone: 'bg-gray-50', hint: 'WIP (MTD) added up from January' },
  { key: 'fullInsuff', label: 'Full Cases Insuff (MTD)', tone: 'bg-gray-50', hint: 'Full cases received this month, now in Insuff' },
  { key: 'criminalWip', label: 'Criminal (MTD) - WIP Cases', tone: 'bg-gray-50', hint: 'Criminal cases received this month, still open, not in Insuff' },
  { key: 'received', label: 'Total Cases Received (MTD)', tone: 'bg-blue-100', hint: 'Cases with a start date this month' },
  { key: 'receivedCriminal', label: 'Case Received (Criminal) - MTD', tone: 'bg-blue-50', hint: 'Criminal cases with a start date this month' },
  { key: 'reportedCriminal', label: 'Criminal Report Sent (MTD)', tone: 'bg-green-100', hint: 'Criminal cases with a report date this month' },
  { key: 'receivedFull', label: 'Cases Received (Full Cases) - MTD', tone: 'bg-indigo-50', hint: 'Full cases with a start date this month' },
  { key: 'reportedFull', label: 'Report Sent Full Cases - MTD', tone: 'bg-green-100', hint: 'Full cases with a report date this month' },
  { key: 'reported', label: 'Total Report (MTD)', tone: 'bg-amber-100', hint: 'All cases with a report date this month' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-10" -> "Oct'26", as in the sheet. */
const monthLabel = (m: string) => {
  const [y, mo] = m.split('-').map(Number);
  return `${MONTHS[mo - 1]}'${String(y).slice(2)}`;
};

interface Props {
  rows: MonthlyRow[];
  /** Used in the heading and the download's file name. */
  title: string;
}

const MonthlyReport: React.FC<Props> = ({ rows, title }) => {
  const scroller = useRef<HTMLDivElement>(null);
  // Latest months are at the bottom, as in the sheet: start scrolled there.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [rows]);

  const download = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Month', ...COLUMNS.map((c) => c.label)],
      ...rows.map((r) => [monthLabel(r.month), ...COLUMNS.map((c) => r[c.key])]),
    ]);
    sheet['!cols'] = [{ wch: 10 }, ...COLUMNS.map(() => ({ wch: 16 }))];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Monthly');
    XLSX.writeFile(book, `${title.replace(/[^A-Za-z0-9]+/g, '_')}_Monthly_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-gray-700">{title} — month by month</CardTitle>
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={download} disabled={rows.length === 0}>
          <Download className="w-3.5 h-3.5 mr-1" /> Excel
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-gray-400">No cases with a start or report date.</p> : (
          <div ref={scroller} className="max-h-[420px] overflow-auto border rounded-md">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-green-100 border px-2 py-1.5 text-left text-xs font-semibold">Month</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} title={c.hint} className={`${c.tone} border px-2 py-1.5 text-xs font-semibold text-center leading-tight min-w-[84px]`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.month} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 font-medium whitespace-nowrap">{monthLabel(r.month)}</td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className={`border px-2 py-1 text-center tabular-nums ${r[c.key] ? '' : 'text-gray-400'}`}>
                        {Number(r[c.key]).toLocaleString('en-IN')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyReport;
