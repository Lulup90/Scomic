import { useMemo, useState } from 'react';
import { pageSize } from '../model/formats';
import { buildExport, exportText, exportWordHtml, fileSafeName, vignette, type ExportOptions } from '../io/exporters';
import { CAN_PRINT, saveFile, WORD_EXT } from '../io/platform';
import { useStore } from '../store/store';
import { notify } from '../store/ui';

async function save(filename: string, content: string, mime: string) {
  const r = await saveFile(filename, content, mime);
  if (r === 'unavailable') notify('Qui non è possibile scaricare file.');
}

/** Sceneggiatura impaginata in formato classico, pronta da stampare o salvare in PDF. */
export function PrintView() {
  const project = useStore((s) => s.project);
  const [opts, setOpts] = useState<ExportOptions>({ repeatInherited: true, includeNotes: true });
  const pages = useMemo(() => buildExport(project, opts), [project, opts]);
  const size = pageSize(project);
  const name = fileSafeName(project.title);

  return (
    <main className="print-view">
      <div className="print-tools no-print">
        <div>
          <h1>Stampa ed esporta</h1>
          <p className="muted">La sceneggiatura nel formato da consegnare a disegnatore ed editore.</p>
        </div>
        <div className="print-options">
          <label className="check">
            <input type="checkbox" checked={opts.repeatInherited} onChange={(e) => setOpts({ ...opts, repeatInherited: e.target.checked })} />
            Ripeti in ogni vignetta ambiente, luogo, momento e luce
          </label>
          <label className="check">
            <input type="checkbox" checked={opts.includeNotes} onChange={(e) => setOpts({ ...opts, includeNotes: e.target.checked })} />
            Includi le note per il disegnatore
          </label>
        </div>
        <div className="print-buttons">
          {CAN_PRINT && (
            <button type="button" className="btn primary" onClick={() => window.print()}>
              Stampa / Salva PDF
            </button>
          )}
          <button
            type="button"
            className={`btn${CAN_PRINT ? '' : ' primary'}`}
            onClick={() => save(`${name}.${WORD_EXT}`, exportWordHtml(project, opts), 'application/msword')}
          >
            Scarica per Word (.{WORD_EXT})
          </button>
          <button type="button" className="btn" onClick={() => save(`${name}.txt`, exportText(project, opts), 'text/plain;charset=utf-8')}>
            Scarica testo (.txt)
          </button>
        </div>
        {!CAN_PRINT && (
          <p className="muted small">
            Per il PDF: apri il file per Word e salvalo come PDF, oppure usa l&apos;app sul tuo computer, dove c&apos;è il pulsante di stampa.
          </p>
        )}
      </div>

      <article className="paper">
        <header className="paper-title">
          <h1>{project.title}</h1>
          {project.subtitle && <p>{project.subtitle}</p>}
          {project.author && <p>di {project.author}</p>}
          <p className="small">
            Formato {size.name} ({size.label}) · {project.pages.length} tavole
          </p>
        </header>
        {pages.map((p) => (
          <section key={p.number} className="paper-page">
            <h2>
              TAVOLA {p.number} <span className="small">({vignette(p.panelCount)})</span>
            </h2>
            {opts.includeNotes && p.notes.trim() && <p className="paper-note">{p.notes}</p>}
            {p.panels.map((v) => (
              <div key={v.number} className="paper-panel">
                <h3>
                  VIGNETTA {v.number}
                  {v.heading && <> — {v.heading}</>}
                </h3>
                <p className="small">
                  {v.size}
                  {v.details.length > 0 && <> · {v.details.join(' · ')}</>}
                </p>
                {v.description.trim() && <p className="paper-desc">{v.description}</p>}
                {v.elements.map((e, i) => (
                  <p key={i} className={`paper-el paper-el-${e.kind}`}>
                    <b>{e.label}:</b> {e.text}
                  </p>
                ))}
              </div>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
