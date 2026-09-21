import { useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Check, X } from 'lucide-react';
import apiService from '@/services/api';

export interface PickedPlace {
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  state?: string;
  pin?: string;
}

interface Props {
  /** Called when the operator picks a suggestion. */
  onPick: (place: PickedPlace) => void;
  /** Shown as the current pin summary, when one is set. */
  pinnedLabel?: string;
  disabled?: boolean;
}

/**
 * Address search backed by the server-side Places proxy.
 *
 * Typing is debounced and short queries are not sent: each keystroke that
 * reaches Google is billable, so the component only queries at 3+ characters
 * and after the operator pauses.
 *
 * A session token groups one search's keystrokes with the final details
 * lookup, which is how Places expects autocomplete to be billed.
 */
const AddressSearchField = ({ onPick, pinnedLabel, disabled }: Props) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ placeId: string; mainText: string; secondaryText: string }>>([]);
  const [searching, setSearching] = useState(false);
  // Separate from `searching`: the details lookup is owned by choose(), while
  // `searching` is owned by the debounce effect. Sharing one flag let each
  // clear the other's spinner.
  const [resolving, setResolving] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const sessionRef = useRef<string>(cryptoRandom());
  const boxRef = useRef<HTMLDivElement>(null);
  // Monotonic id for in-flight searches. Debouncing only cancels a timer that
  // has not fired; once a request is away, a slow earlier response could still
  // land after a newer one and overwrite it with suggestions for stale text.
  const reqSeqRef = useRef(0);

  function cryptoRandom() {
    try {
      return (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Math.random());
    } catch {
      return String(Math.random());
    }
  }

  // Close the dropdown on an outside click, so it does not hang over the rest
  // of the dialog after the operator moves on.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      // Also drop any previous error and close the list: otherwise a failure
      // message ("Address search is unavailable") stays pinned under an empty
      // box after the operator clears it to retype, describing nothing.
      setResults([]);
      setSearching(false);
      setError('');
      setOpen(false);
      // Invalidate anything in flight so a late response cannot repopulate
      // the dropdown for text that is no longer in the box.
      reqSeqRef.current += 1;
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const seq = ++reqSeqRef.current;
      const isStale = () => seq !== reqSeqRef.current;
      try {
        setError('');
        const res = await apiService.searchAddresses(q, sessionRef.current);
        if (isStale()) return;
        if (res.success && Array.isArray(res.data)) {
          setResults(res.data);
          setOpen(true);
        } else {
          setResults([]);
          setError(res.message || 'Address search is unavailable.');
        }
      } catch (e: any) {
        if (isStale()) return;
        setResults([]);
        setError(e?.message || 'Address search is unavailable.');
      } finally {
        if (!isStale()) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const choose = async (placeId: string) => {
    setOpen(false);
    setResolving(true);
    // Invalidate in-flight searches: their results are irrelevant now that a
    // suggestion has been picked, and must not reopen the dropdown.
    reqSeqRef.current += 1;
    try {
      const res = await apiService.getPlaceDetails(placeId, sessionRef.current);
      if (res.success && res.data) {
        onPick(res.data);
        setQuery('');
        setResults([]);
        // A session token is consumed by its details call; start a fresh one.
        sessionRef.current = cryptoRandom();
      } else {
        setError(res.message || 'Could not load that address.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load that address.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <Label htmlFor="addressSearch">Search address</Label>
      <div className="relative">
        <Input
          id="addressSearch"
          autoComplete="off"
          placeholder="Start typing the address…"
          value={query}
          disabled={disabled || resolving}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {(searching || resolving) && (
          <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((r) => (
            <li key={r.placeId}>
              <button
                type="button"
                onClick={() => choose(r.placeId)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 flex gap-2 items-start"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span>
                  <span className="block text-sm text-gray-900">{r.mainText}</span>
                  {r.secondaryText && (
                    <span className="block text-xs text-gray-500">{r.secondaryText}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <X className="w-3 h-3" /> {error}
        </p>
      )}

      {pinnedLabel && (
        <p className="text-xs text-green-700 mt-2 flex items-start gap-1">
          <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{pinnedLabel}</span>
        </p>
      )}
    </div>
  );
};

export default AddressSearchField;
