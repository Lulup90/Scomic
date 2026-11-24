import { Fragment, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { FORMATS, fmtNum, pageSize } from '../model/formats';
import { TEMPLATES, templateSlots, type LayoutTemplate } from '../model/layout';
import type { FormatKey, Page } from '../model/types';
import { applyPageTemplate, resizePanel, resizeStrip, setCustomSize, setFormat } from '../store/actions';
import { useResolved } from '../store/derived';
import { useStore } from '../store/store';
import { IconWarn } from './icons';
import { MiniLayout } from './MiniPage';

const HANDLE = 8; // px tra vignette e tra strisce (lo spazio bianco tra le vignette)

export function PagePreview() {
  const project = useStore((s) => s.project);
  const pageId = useStore((s) => s.pageId);
  const panelId = useStore((s) => s.panelId);
  const page = project.pages.find((p) => p.id === pageId);
  const resolved = useResolved();
  const rpage = resolved.byPage[pageId];
  const sheetRef = useRef<HTMLDivElement>(null);
  if (!page || !rpage) return null;
  const size = pageSize(project);
  const sel = panelId ? resolved.byPanel[panelId] : undefined;
  const selLoc = sel && sel.pageId === pageId ? locate(page, sel.panel.id) : null;
  const dense = rpage.panels.filter((p) => p.dense);

  function chooseTemplate(t: LayoutTemplate) {
    const slots = templateSlots(t);
    const n = rpage.panels.length;
    if (slots !== n) {
      const msg =
        slots > n
          ? `La griglia "${t.name}" ha ${slots} spazi e la tavola ${n} vignette: verranno aggiunte ${slots - n} vignette vuote. Continuare?`
          : `La griglia "${t.name}" ha ${slots} spazi e la tavola ${n} vignette: le ${n - slots} in più finiranno nell'ultima striscia. Continuare?`;
      if (!confirm(msg)) return;
    }
    applyPageTemplate(page!.id, t);
  }

  /** Trascinamento del bordo tra due vignette (orizzontale) o tra due strisce (verticale). */
  function startDrag(e: PointerEvent<HTMLDivElement>, kind: 'panel' | 'strip', si: number, pi: number) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const container = kind === 'panel' ? (handle.parentElement as HTMLElement) : sheetRef.current!;
    const rect = container.getBoundingClientRect();
    const styles = getComputedStyle(container);
    const p = page!;
    const count = kind === 'panel' ? p.strips[si].panels.length : p.strips.length;
    const padding =
      kind === 'panel'
        ? 0
        : parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const avail = (kind === 'panel' ? rect.width : rect.height - padding) - HANDLE * (count - 1);
    const values = kind === 'panel' ? p.strips[si].panels.map((x) => x.width) : p.strips.map((s) => s.height);
    const sumVals = values.reduce((a, b) => a + b, 0);
    const startVal = values[pi];
    const startPos = kind === 'panel' ? e.clientX : e.clientY;

    const move = (ev: globalThis.PointerEvent) => {
      const delta = ((kind === 'panel' ? ev.clientX : ev.clientY) - startPos) / avail * sumVals;
      const v = startVal + delta;
      if (kind === 'panel') resizePanel(p.id, si, pi, v, pi + 1);
      else resizeStrip(p.id, si, v, si + 1);
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  }

  function keyResize(e: KeyboardEvent<HTMLDivElement>, kind: 'panel' | 'strip', si: number, pi: number) {
    const step = e.shiftKey ? 5 : 1;
    const back = kind === 'panel' ? 'ArrowLeft' : 'ArrowUp';
    const fwd = kind === 'panel' ? 'ArrowRight' : 'ArrowDown';
    if (e.key !== back && e.key !== fwd) return;
    e.preventDefault();
    const d = e.key === fwd ? step : -step;
    if (kind === 'panel') resizePanel(page!.id, si, pi, page!.strips[si].panels[pi].width + d, pi + 1);
    else resizeStrip(page!.id, si, page!.strips[si].height + d, si + 1);
  }

  return (
    <section className="preview" aria-label="Anteprima tavola">
      <div className="preview-head">
        <h2>Anteprima tavola</h2>
        <label className="inline-label">
          Formato
          <select value={project.format} onChange={(e) => setFormat(e.target.value as FormatKey)}>
            {FORMATS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.name} · {f.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {project.format === 'custom' && (
        <div className="custom-size">
          <label className="inline-label">
            Base (cm)
            <input
              type="number"
              min={5}
              max={60}
              step={0.1}
              value={project.customSize.w}
              onChange={(e) => setCustomSize(Number(e.target.value) || 1, project.customSize.h)}
            />
          </label>
          <label className="inline-label">
            Altezza (cm)
            <input
              type="number"
              min={5}
              max={80}
              step={0.1}
              value={project.customSize.h}
              onChange={(e) => setCustomSize(project.customSize.w, Number(e.target.value) || 1)}
            />
          </label>
        </div>
      )}

      <div className="templates" role="group" aria-label="Griglie pronte">
        {TEMPLATES.map((t) => (
          <button key={t.key} type="button" className="template-btn" onClick={() => chooseTemplate(t)} title={`Applica la griglia "${t.name}"`}>
            <span className="template-thumb" aria-hidden="true">
              <MiniLayout rows={t.rows.map((r) => ({ h: r.h, cells: r.w.map((w) => ({ w })) }))} />
            </span>
            {t.name}
          </button>
        ))}
      </div>

      <div className="sheet-wrap">
        <div
          ref={sheetRef}
          className="sheet"
          style={{ aspectRatio: `${size.w} / ${size.h}` }}
          aria-label={`Tavola ${rpage.number}, formato ${size.name} ${size.label}`}
        >
          {page.strips.map((strip, si) => (
            <Fragment key={strip.id}>
              <div className="p-strip" style={{ flex: `${strip.height} 1 0` }}>
                <span className="strip-label" aria-hidden="true">
                  <span>Str. {si + 1}</span>
                  <b>{fmtNum(rpage.panels.find((x) => x.stripIndex === si)?.height ?? strip.height)}%</b>
                </span>
                {strip.panels.map((panel, pi) => {
                  const rp = resolved.byPanel[panel.id];
                  const isSel = panel.id === panelId;
                  return (
                    <Fragment key={panel.id}>
                      <button
                        type="button"
                        className={`p-panel${isSel ? ' selected' : ''}${rp.dense ? ' dense' : ''}`}
                        style={{ flex: `${panel.width} 1 0` }}
                        aria-pressed={isSel}
                        aria-label={`Vignetta ${rp.number}: ${fmtNum(rp.width)}% di larghezza, ${fmtNum(rp.height)}% di altezza, ${fmtNum(rp.area)}% della tavola`}
                        onClick={() => {
                          useStore.getState().selectPanel(panel.id);
                          useStore.getState().requestFocus(`card:${panel.id}`);
                        }}
                      >
                        <span className="p-num">
                          {rp.number}
                          {rp.dense && (
                            <span className="p-warn" title="Troppo testo per lo spazio">
                              <IconWarn size={13} />
                            </span>
                          )}
                        </span>
                        <span className="p-info">
                          <span>
                            {fmtNum(rp.width)}% × {fmtNum(rp.height)}%
                          </span>
                          <b>{fmtNum(rp.area)}% tavola</b>
                        </span>
                      </button>
                      {pi < strip.panels.length - 1 && (
                        <div
                          className="handle handle-v"
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Bordo tra la vignetta ${rp.number} e la successiva`}
                          aria-valuenow={Math.round(panel.width)}
                          aria-valuemin={8}
                          aria-valuemax={92}
                          tabIndex={0}
                          onPointerDown={(e) => startDrag(e, 'panel', si, pi)}
                          onKeyDown={(e) => keyResize(e, 'panel', si, pi)}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </div>
              {si < page.strips.length - 1 && (
                <div
                  className="handle handle-h"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label={`Bordo tra la striscia ${si + 1} e la successiva`}
                  aria-valuenow={Math.round(strip.height)}
                  aria-valuemin={8}
                  aria-valuemax={92}
                  tabIndex={0}
                  onPointerDown={(e) => startDrag(e, 'strip', si, si)}
                  onKeyDown={(e) => keyResize(e, 'strip', si, si)}
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>
      <p className="hint">Trascina i bordi tra le vignette e tra le strisce per cambiare le proporzioni. Clicca una vignetta per aprirne il testo.</p>

      {sel && selLoc && (
        <div className="inspector">
          <div className="inspector-head">
            <h3>Vignetta {sel.number}</h3>
            <span>
              <b>{fmtNum(sel.area)}%</b> della tavola · {sel.words} parole
            </span>
          </div>
          <div className="inspector-grid">
            <label>
              Larghezza nella striscia (%)
              <input
                type="number"
                min={8}
                max={92}
                step={1}
                value={Math.round(sel.panel.width * 10) / 10}
                disabled={page.strips[selLoc.si].panels.length === 1}
                onChange={(e) => resizePanel(page.id, selLoc.si, selLoc.pi, Number(e.target.value))}
              />
            </label>
            <label>
              Altezza striscia {selLoc.si + 1} (%)
              <input
                type="number"
                min={8}
                max={92}
                step={1}
                value={Math.round(page.strips[selLoc.si].height * 10) / 10}
                disabled={page.strips.length === 1}
                onChange={(e) => resizeStrip(page.id, selLoc.si, Number(e.target.value))}
              />
            </label>
          </div>
          <p className="inspector-size">
            Sulla tavola stampata: circa {fmtNum((size.w * sel.width) / 100)} × {fmtNum((size.h * sel.height) / 100)} cm (margini esclusi)
          </p>
          <div className={`status ${sel.dense ? 'bad' : 'ok'}`}>
            {sel.words === 0
              ? 'Nessun testo nei balloon.'
              : sel.dense
                ? `Troppo testo: ${fmtNum(sel.density)} parole per ogni 1% di tavola (soglia ${fmtNum(project.densityThreshold)}). Allarga la vignetta o taglia i balloon.`
                : `Spazio sufficiente: ${fmtNum(sel.density)} parole per ogni 1% di tavola.`}
          </div>
        </div>
      )}

      {dense.length > 0 && (
        <div className="warnings">
          <b>
            <IconWarn /> Controllo spazio
          </b>
          {dense.map((p) => (
            <button
              key={p.panel.id}
              type="button"
              className="link-btn"
              onClick={() => {
                useStore.getState().selectPanel(p.panel.id);
                useStore.getState().requestFocus(`card:${p.panel.id}`);
              }}
            >
              Vignetta {p.number}: {p.words} parole in {fmtNum(p.area)}% della tavola
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function locate(page: Page, panelId: string): { si: number; pi: number } | null {
  for (let si = 0; si < page.strips.length; si++) {
    const pi = page.strips[si].panels.findIndex((p) => p.id === panelId);
    if (pi >= 0) return { si, pi };
  }
  return null;
}
