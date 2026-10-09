import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

// Searchable multi-select for tracker filters ({ value, label } options).

export interface PickOption {
  value: string;
  label: string;
}

interface MultiPickProps {
  label: string;
  options: PickOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
  /** Show a search box when there are this many options or more. */
  searchFrom?: number;
}

const MultiPick: React.FC<MultiPickProps> = ({ label, options, selected, onChange, className = '', searchFrom = 8 }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const shown = useMemo(
    () => options.filter((o) => !query || o.label.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const summary = selected.length === 0
    ? label
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label || label
      : `${label}: ${selected.length}`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-9 w-full flex items-center justify-between gap-1 px-3 rounded-md border text-sm bg-white ${selected.length ? 'border-brand-green text-gray-900' : 'border-gray-300 text-gray-600'}`}
      >
        <span className="truncate">{summary}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {selected.length > 0 && (
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" onClick={(e) => { e.stopPropagation(); onChange([]); }} />
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 min-w-full w-64 max-h-72 overflow-y-auto rounded-md border bg-white shadow-lg">
          {options.length >= searchFrom && (
            <div className="p-2 border-b sticky top-0 bg-white">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full h-8 px-2 border border-gray-300 rounded text-sm"
              />
            </div>
          )}
          {shown.length === 0 && <p className="p-3 text-sm text-gray-400">No options</p>}
          {shown.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center ${selected.includes(o.value) ? 'bg-brand-green border-brand-green' : 'border-gray-300'}`}>
                {selected.includes(o.value) && <Check className="w-3 h-3 text-white" />}
              </span>
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiPick;
