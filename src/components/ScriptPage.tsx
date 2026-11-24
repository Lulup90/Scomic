import { Fragment } from 'react';
import { addPanel, addStrip, setPageNotes } from '../store/actions';
import { useResolved } from '../store/derived';
import { useStore } from '../store/store';
import { AutoTextarea } from './AutoTextarea';
import { IconInherit, IconPlus } from './icons';
import { PanelCard } from './PanelCard';

export function ScriptPage() {
  const pageId = useStore((s) => s.pageId);
  const panelId = useStore((s) => s.panelId);
  const page = useStore((s) => s.project.pages.find((p) => p.id === s.pageId));
  const resolved = useResolved();
  const rpage = resolved.byPage[pageId];
  if (!page || !rpage) return null;

  return (
    <section className="script" aria-label={`Sceneggiatura della tavola ${rpage.number}`}>
      <div className="script-head">
        <h1>Tavola {rpage.number}</h1>
        <span className="muted">
          {page.strips.length} {page.strips.length === 1 ? 'striscia' : 'strisce'} · {rpage.panels.length}{' '}
          {rpage.panels.length === 1 ? 'vignetta' : 'vignette'} · {rpage.words} parole nei balloon
        </span>
      </div>
      <AutoTextarea
        className="page-notes"
        aria-label="Note sulla tavola"
        placeholder="Note generali sulla tavola (ritmo, atmosfera, indicazioni)…"
        value={page.notes}
        onChange={(e) => setPageNotes(page.id, e.target.value)}
      />
      <div className="legend">
        <span>
          <span className="field inherited legend-chip">
            <IconInherit />
            ripreso
          </span>
          = copiato in automatico dalla vignetta prima
        </span>
        <span>
          <span className="field own legend-chip">
            <span className="field-main">scritto</span>
          </span>
          = cambiato in questa vignetta
        </span>
      </div>

      {page.strips.map((strip, si) => (
        <Fragment key={strip.id}>
          <div className="strip-divider">
            <span>Striscia {si + 1}</span>
          </div>
          {strip.panels.map((panel) => {
            const rp = resolved.byPanel[panel.id];
            if (!rp) return null;
            return (
              <PanelCard
                key={panel.id}
                rp={rp}
                selected={panel.id === panelId}
                isFirst={rp.index === 1}
                isLast={rp.index === rpage.panels.length}
                canDelete={rpage.panels.length > 1}
              />
            );
          })}
        </Fragment>
      ))}

      <div className="script-add">
        <button type="button" className="btn" onClick={() => addPanel(page.id, panelId)}>
          <IconPlus size={14} /> Vignetta nella stessa striscia
        </button>
        <button type="button" className="btn" onClick={() => addStrip(page.id, panelId)}>
          <IconPlus size={14} /> Nuova striscia
        </button>
      </div>

      <div className="shortcuts">
        <span>
          <kbd>Invio</kbd> nuovo balloon/didascalia
        </span>
        <span>
          <kbd>Maiusc</kbd>+<kbd>Invio</kbd> a capo
        </span>
        <span>
          <kbd>Ctrl</kbd>+<kbd>Invio</kbd> nuova vignetta
        </span>
        <span>
          <kbd>Ctrl</kbd>+<kbd>Z</kbd> annulla
        </span>
      </div>
    </section>
  );
}
