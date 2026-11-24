import { useMemo, useState } from 'react';
import { pageSize } from '../model/formats';
import { exportDocx, exportStoryDocx } from '../io/docx';
import { buildExport, exportStoryText, exportText, fileSafeName, storyParagraphs, vignette, type ExportOptions } from '../io/exporters';
import { CAN_PRINT, saveFile } from '../io/platform';
import { useStore } from '../store/store';
import { notify, openWindow } from '../store/ui';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TXT = 'text/plain;charset=utf-8';

async function save(filename: string, content: string | Blob, mime: string) {
  const r = await saveFile(filename, content, mime);
  if (r === 'unavailable') notify('Qui non è possibile scaricare file.');
}

type Doc = 'sceneggiatura' | 'storia';

/** Sceneggiatura e, a parte, logline e soggetto: impaginati, da stampare o esportare. */
export function PrintView() {
  const project = useStore((s) => s.project);
  const [doc, setDoc] = useState<Doc>('sceneggiatura');
  const [opts, setOpts] = useState<ExportOptions>({ repeatInherited: true, includeNotes: true });
  const pages = useMemo(() => buildExport(project, opts), [project, opts]);
  const size = pageSize(project);
  const name = fileSafeName(project.title);
  const soggetto = storyParagraphs(project.soggetto);
  const storyEmpty = !project.logline.trim() && soggetto.length === 0;

  const pdfNote = !CAN_PRINT && (
    <p className="muted small">
      Per il PDF: apri il file Word e salvalo come PDF, oppure usa Scomic da lulup90.github.io/Scomic, dove c&apos;è il pulsante di stampa.
    </p>
  );

  return (
    <main className="print-view">
      <div className="print-tools no-print">
        <div>
          <h1>Stampa ed esporta</h1>
          <p className="muted">Sceneggiatura e soggetto sono due documenti separati, da esportare ognuno per conto suo.</p>
        </div>
        <div className="doc-switch" role="tablist" aria-label="Documento">
          <button type="button" role="tab" aria-selected={doc === 'sceneggiatura'} onClick={() => setDoc('sceneggiatura')}>
            Sceneggiatura
          </button>
          <button type="button" role="tab" aria-selected={doc === 'storia'} onClick={() => setDoc('storia')}>
            Soggetto e logline
          </button>
        </div>

        {doc === 'sceneggiatura' ? (
          <>
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
              <button type="button" className={`btn${CAN_PRINT ? '' : ' primary'}`} onClick={async () => save(`${name}.docx`, await exportDocx(project, opts), DOCX)}>
                Scarica Word (.docx)
              </button>
              <button type="button" className="btn" onClick={() => save(`${name}.txt`, exportText(project, opts), TXT)}>
                Scarica testo (.txt)
              </button>
            </div>
          </>
        ) : (
          <div className="print-buttons">
            {CAN_PRINT && (
              <button type="button" className="btn primary" disabled={storyEmpty} onClick={() => window.print()}>
                Stampa / Salva PDF
              </button>
            )}
            <button
              type="button"
              className={`btn${CAN_PRINT ? '' : ' primary'}`}
              disabled={storyEmpty}
              onClick={async () => save(`${name}-soggetto.docx`, await exportStoryDocx(project), DOCX)}
            >
              Scarica Word (.docx)
            </button>
            <button type="button" className="btn" disabled={storyEmpty} onClick={() => save(`${name}-soggetto.txt`, exportStoryText(project), TXT)}>
              Scarica testo (.txt)
            </button>
          </div>
        )}
        {pdfNote}
      </div>

      {doc === 'sceneggiatura' ? (
        <article className="paper" aria-label="Anteprima della sceneggiatura">
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
      ) : (
        <article className="paper paper-story-doc" aria-label="Anteprima di soggetto e logline">
          <header className="paper-title">
            <h1>{project.title}</h1>
            {project.subtitle && <p>{project.subtitle}</p>}
            {project.author && <p>di {project.author}</p>}
          </header>
          {storyEmpty && (
            <div className="story-empty no-print">
              <p>Non hai ancora scritto logline e soggetto.</p>
              <div className="print-buttons">
                <button type="button" className="btn" onClick={() => openWindow('logline')}>
                  Scrivi la logline
                </button>
                <button type="button" className="btn" onClick={() => openWindow('soggetto')}>
                  Scrivi il soggetto
                </button>
              </div>
            </div>
          )}
          {project.logline.trim() && (
            <section className="paper-story">
              <h2>LOGLINE</h2>
              <p>{project.logline.trim()}</p>
            </section>
          )}
          {soggetto.length > 0 && (
            <section className="paper-story">
              <h2>SOGGETTO</h2>
              {soggetto.map((s, i) => (
                <p key={i}>{s}</p>
              ))}
            </section>
          )}
        </article>
      )}
    </main>
  );
}
