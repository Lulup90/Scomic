import type { ResolvedPage } from '../model/resolve';
import type { Page } from '../model/types';

interface MiniRow {
  h: number;
  cells: { w: number; className?: string }[];
}

/** Disegno in miniatura di una griglia (righe e celle in percentuale). */
export function MiniLayout({ rows }: { rows: MiniRow[] }) {
  return (
    <>
      {rows.map((r, i) => (
        <span key={i} className="mini-row" style={{ flex: `${r.h} 1 0` }}>
          {r.cells.map((c, j) => (
            <span key={j} className={`mini-cell ${c.className ?? ''}`} style={{ flex: `${c.w} 1 0` }} />
          ))}
        </span>
      ))}
    </>
  );
}

export function pageRows(page: Page, rpage: ResolvedPage | undefined, selectedPanelId?: string | null): MiniRow[] {
  return page.strips.map((s) => ({
    h: s.height,
    cells: s.panels.map((p) => {
      const rp = rpage?.panels.find((x) => x.panel.id === p.id);
      const empty = !p.description.trim() && p.elements.length === 0;
      const cls = [rp?.dense ? 'dense' : '', empty ? 'empty' : '', p.id === selectedPanelId ? 'sel' : ''].join(' ');
      return { w: p.width, className: cls };
    }),
  }));
}
