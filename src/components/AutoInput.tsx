import { forwardRef, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Chiamato quando l'utente lascia il campo o conferma (per aggiungere all'archivio). */
  onCommit?: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  ariaLabel: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}

/** Campo di testo con suggerimenti presi dall'archivio e dai valori già usati. */
export const AutoInput = forwardRef<HTMLInputElement, Props>(function AutoInput(
  { value, onChange, onCommit, suggestions, placeholder, className, ariaLabel, onKeyDown, autoFocus },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef<ReturnType<typeof setTimeout>>();
  // Valore più recente: al blur il componente può non essersi ancora aggiornato dopo una scelta
  const latest = useRef(value);
  latest.current = value;

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const uniq = [...new Set(suggestions.filter(Boolean))];
    if (!q) return uniq.slice(0, 8);
    const starts = uniq.filter((s) => s.toLowerCase().startsWith(q));
    const contains = uniq.filter((s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q));
    return [...starts, ...contains].filter((s) => s.toLowerCase() !== q).slice(0, 8);
  }, [value, suggestions]);

  useEffect(() => setActive(0), [value]);
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  const show = open && matches.length > 0;

  function pick(v: string) {
    latest.current = v;
    onChange(v);
    onCommit?.(v);
    setOpen(false);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (show) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % matches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a - 1 + matches.length) % matches.length);
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && value.trim()) {
        e.preventDefault();
        pick(matches[active]);
        // Lascia che Enter/Tab proseguano verso il campo successivo dopo la scelta
        onKeyDown?.(e);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
    }
    if (e.key === 'Enter' || e.key === 'Escape') onCommit?.(latest.current);
    onKeyDown?.(e);
  }

  return (
    <div className="auto">
      <input
        ref={ref}
        className={className}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        autoFocus={autoFocus}
        onChange={(e) => {
          latest.current = e.target.value;
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            onCommit?.(latest.current);
          }, 120);
        }}
        onKeyDown={handleKey}
      />
      {show && (
        <ul className="auto-list" id={listId} role="listbox">
          {matches.map((m, i) => (
            <li
              key={m}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(m);
              }}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
