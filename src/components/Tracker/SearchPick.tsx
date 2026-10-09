import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

// Searchable single-select for long lists (companies). Type to filter,
// arrow keys + Enter to choose, Esc to close. `pinned` options (e.g. "Skip
// these rows") always stay at the top of the list.

export interface SearchPickOption {
  value: string;
  label: string;
}

interface SearchPickProps {
  value: string;
  options: SearchPickOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  pinned?: SearchPickOption[];
  disabled?: boolean;
  /** Highlight the box (e.g. nothing chosen yet). */
  warn?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const SearchPick: React.FC<SearchPickProps> = ({
  value, options, onChange, placeholder = 'Choose…', pinned = [], disabled, warn, size = 'md', className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery(''); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    // Names starting with the query come first.
    const sorted = q
      ? [...matches].sort((a, b) => Number(!a.label.toLowerCase().startsWith(q)) - Number(!b.label.toLowerCase().startsWith(q)))
      : matches;
    return [...pinned, ...sorted];
  }, [options, pinned, query]);

  // While searching, highlight the first matching company (not a pinned
  // option like "Skip these rows"), so Enter picks what was typed for.
  useEffect(() => {
    setActive(query.trim() && list.length > pinned.length ? pinned.length : 0);
  }, [query, open, list.length, pinned.length]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const current = [...pinned, ...options].find((o) => o.value === value);
  const choose = (v: string) => { onChange(v); setOpen(false); setQuery(''); };
  const h = size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 0); }}
        className={`${h} w-full flex items-center justify-between gap-1 px-2 rounded-md border bg-white text-left disabled:opacity-50 disabled:cursor-not-allowed ${warn ? 'border-amber-400' : 'border-gray-300'} ${open ? 'ring-2 ring-brand-green/30' : ''}`}
        title={current?.label}
      >
        <span className={`truncate ${current ? 'text-gray-900' : 'text-gray-500'}`}>{current?.label || placeholder}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-gray-400" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 right-0 min-w-full w-80 max-w-[90vw] rounded-md border bg-white shadow-lg">
          <div className="p-2 border-b relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              className="w-full h-8 pl-7 pr-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-brand-green"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, list.length - 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
                else if (e.key === 'Enter') { e.preventDefault(); if (list[active]) choose(list[active].value); }
                else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
              }}
            />
          </div>
          <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
            {list.length === pinned.length && query && <p className="px-3 py-2 text-sm text-gray-400">No company matches “{query}”</p>}
            {list.map((o, i) => (
              <button
                key={`${o.value}-${i}`}
                type="button"
                data-index={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${i === active ? 'bg-gray-100' : ''} ${i < pinned.length ? 'text-gray-600 italic' : 'text-gray-900'} ${i === pinned.length - 1 && pinned.length ? 'border-b' : ''}`}
              >
                <span>{o.label}</span>
                {o.value === value && <Check className="w-4 h-4 text-brand-green shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPick;
