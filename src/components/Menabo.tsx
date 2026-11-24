import { pageSize } from '../model/formats';
import { addPage } from '../store/actions';
import { useResolved } from '../store/derived';
import { useStore } from '../store/store';
import { IconPlus } from './icons';
import { MiniLayout, pageRows } from './MiniPage';

/** Tutte le tavole in miniatura, a coppie come nell'albo stampato (la tavola 1 è a destra). */
export function Menabo() {
  const project = useStore((s) => s.project);
  const pageId = useStore((s) => s.pageId);
  const resolved = useResolved();
  const size = pageSize(project);
  const dense = resolved.pages.reduce((a, p) => a + p.denseCount, 0);
  const written = resolved.pages.filter((p) => p.words > 0 || p.panels.some((x) => x.panel.description.trim())).length;

  const slots: (number | null)[] = [null, ...project.pages.map((_, i) => i)];
  if (slots.length % 2) slots.push(null);
  const spreads: (number | null)[][] = [];
  for (let i = 0; i < slots.length; i += 2) spreads.push([slots[i], slots[i + 1]]);

  const open = (id: string) => {
    useStore.getState().selectPage(id);
    useStore.getState().setView('scrivi');
  };

  return (
    <main className="menabo">
      <div className="menabo-head">
        <div>
          <h1>Menabò</h1>
          <p className="muted">Tutte le tavole a coppie, come nell&apos;albo stampato. Clicca una tavola per aprirla.</p>
        </div>
        <div className="stats">
          <div className="stat">
            <span>Tavole scritte</span>
            <b>
              {written} / {project.pages.length}
            </b>
          </div>
          <div className="stat">
            <span>Vignette</span>
            <b>{resolved.totalPanels}</b>
          </div>
          <div className="stat">
            <span>Parole nei balloon</span>
            <b>{resolved.totalWords}</b>
          </div>
          <div className="stat">
            <span>Da controllare</span>
            <b className={dense ? 'warn-text' : undefined}>{dense}</b>
          </div>
        </div>
      </div>
      <div className="legend">
        <span>
          <span className="sw sw-sel" /> Tavola aperta
        </span>
        <span>
          <span className="sw sw-dense" /> Vignetta con troppo testo
        </span>
        <span>
          <span className="sw sw-empty" /> Vignetta ancora vuota
        </span>
      </div>
      <div className="spreads">
        {spreads.map((sp, k) => (
          <div key={k} className="spread">
            <div className="spread-pages">
              {sp.map((idx, j) => {
                if (idx === null) return <div key={j} className="spread-blank" style={{ aspectRatio: `${size.w} / ${size.h}` }} />;
                const page = project.pages[idx];
                const rp = resolved.byPage[page.id];
                return (
                  <button
                    key={page.id}
                    type="button"
                    className={`thumb${page.id === pageId ? ' current' : ''}`}
                    style={{ aspectRatio: `${size.w} / ${size.h}` }}
                    onClick={() => open(page.id)}
                    aria-label={`Apri la tavola ${idx + 1}`}
                  >
                    <MiniLayout rows={pageRows(page, rp)} />
                  </button>
                );
              })}
            </div>
            <div className="spread-labels">
              {sp.map((idx, j) => {
                if (idx === null) return <span key={j} />;
                const rp = resolved.byPage[project.pages[idx].id];
                return (
                  <span key={j}>
                    <b>Tavola {idx + 1}</b>
                    <span className="muted small">
                      {rp.panels.length} vign. · {rp.words} parole
                      {rp.denseCount ? ` · ${rp.denseCount} da controllare` : ''}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        <button type="button" className="add-page-tile" onClick={() => addPage(project.pages[project.pages.length - 1].id)}>
          <IconPlus /> Nuova tavola
        </button>
      </div>
    </main>
  );
}
