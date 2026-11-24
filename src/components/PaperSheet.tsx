import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Misure di un foglio A4 a 96 punti per pollice, con margini di 2,5 cm:
// le stesse dell'esportazione Word e della stampa, così l'anteprima mostra
// quante pagine occuperà ogni tavola.
export const PAGE_W = 794;
export const PAGE_H = 1123;
export const MARGIN = 94;
export const INNER_H = PAGE_H - MARGIN * 2;

interface Props {
  children: ReactNode;
  /** Nome del contenuto per le scritte di continuazione, es. "Tavola 3". */
  label: string;
  /** Inizia su una pagina nuova (in stampa). */
  breakBefore?: boolean;
  onPages?: (pages: number) => void;
  className?: string;
}

/**
 * Un foglio A4: se il contenuto non ci sta, il foglio si allunga di pagine intere
 * e una riga tratteggiata segna dove comincia la pagina successiva. Il resto
 * dell'ultima pagina resta bianco: il contenuto dopo parte su un foglio nuovo.
 */
export function PaperSheet({ children, label, breakBefore = true, onPages, className = '' }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(1);
  const onPagesRef = useRef(onPages);
  onPagesRef.current = onPages;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      const n = Math.max(1, Math.ceil((el.scrollHeight - 1) / INNER_H));
      setPages((p) => (p === n ? p : n));
      onPagesRef.current?.(n);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      className={`paper-sheet${breakBefore ? ' break-before' : ''}${pages > 1 ? ' overflow' : ''} ${className}`}
      style={{ minHeight: pages * PAGE_H }}
      aria-label={pages > 1 ? `${label}, ${pages} pagine` : label}
    >
      <div className="paper-sheet-content" ref={contentRef}>
        {children}
      </div>
      {Array.from({ length: pages - 1 }, (_, i) => (
        <div key={i} className="page-cut no-print" style={{ top: MARGIN + (i + 1) * INNER_H }} aria-hidden="true">
          <span>
            pagina {i + 2} · {label} continua
          </span>
        </div>
      ))}
      <span className="page-count no-print" aria-hidden="true">
        {pages > 1 ? `${label}: ${pages} pagine` : label}
      </span>
    </section>
  );
}
