import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allLabel?: string;
  className?: string;
  disabled?: boolean;
}

// Single-select searchable dropdown (e.g. "filter vendors by city"). Includes
// an "All" option (value '') at the top of the list when allLabel is set.
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  allLabel,
  className,
  disabled = false,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const select = (option: string) => {
    onChange(option);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex h-11 sm:h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn(!value && 'text-muted-foreground')}>
          {value || (allLabel ?? placeholder)}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-white shadow-lg">
          <div className="p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded border border-input px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter' && filtered.length === 1) select(filtered[0]);
              }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {allLabel && (
              <div
                onClick={() => select('')}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-100',
                  !value && 'bg-blue-50'
                )}
              >
                <span>{allLabel}</span>
                {!value && <Check className="h-4 w-4 text-blue-600" />}
              </div>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
            )}
            {filtered.map((option) => (
              <div
                key={option}
                onClick={() => select(option)}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-100',
                  value === option && 'bg-blue-50'
                )}
              >
                <span>{option}</span>
                {value === option && <Check className="h-4 w-4 text-blue-600" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
