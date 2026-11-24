import { useEffect, useMemo, useRef, useState } from 'react';
import { fileToText, parseScript } from '../io/importer';
import { unlink } from '../io/fileLink';
import { appendImported } from '../store/actions';
import { useStore } from '../store/store';
import { askConfirm, notify, openImport, useUi } from '../store/ui';
import { IconClose } from './icons';
import { MiniLayout, pageRows } from './MiniPage';
import { resolveProject } from '../model/resolve';

const EXAMPLE = `TAVOLA 1
VIGNETTA 1 — EST. PORTO — NOTTE
Campo lungo. Il molo deserto nella nebbia.
DIDASCALIA: Genova, novembre.

VIGNETTA 2
Primo piano di Marco.
MARCO: Dov'è finita?
MARCO (pensiero): Non verrà.
SFX: DONG`;

/** Importazione di una sceneggiatura da Word (.docx), testo semplice o testo incollato. */
export function ImportDialog() {
  const open = useUi((s) => s.importOpen);
  const characters = useStore((s) => s.project.characters);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useUi.getState().confirm) openImport(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const result = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return parseScript(
        text,
        characters.map((c) => c.name),
      );
    } catch {
      return null;
    }
  }, [text, characters]);
  const resolved = useMemo(() => (result ? resolveProject(result.project) : null), [result]);

  if (!open) return null;

  const close = () => {
    openImport(false);
    setText('');
    setFileName('');
    setError('');
  };

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      setText(await fileToText(file));
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Il file non è leggibile.');
    } finally {
      setLoading(false);
    }
  }

  async function importAsNew() {
    if (!result) return;
    if (!(await askConfirm('Il progetto aperto verrà chiuso e sostituito da quello importato. Salvalo prima su file se vuoi conservarlo.', 'Importa come nuovo progetto', true)))
      return;
    unlink();
    useStore.getState().loadProject(result.project);
    notify(`Importat${result.stats.pages === 1 ? 'a 1 tavola' : `e ${result.stats.pages} tavole`} e ${result.stats.panels} ${result.stats.panels === 1 ? 'vignetta' : 'vignette'}.`);
    close();
  }

  function importAppend() {
    if (!result) return;
    appendImported(result.project);
    notify(result.stats.pages === 1 ? 'Aggiunta 1 tavola in fondo al progetto.' : `Aggiunte ${result.stats.pages} tavole in fondo al progetto.`);
    close();
  }

  const s = result?.stats;

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="import-head">
          <h2 id="import-title">Importa una sceneggiatura</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Chiudi" onClick={close}>
            <IconClose />
          </button>
        </div>
        <p className="muted">
          Scegli un file Word (.docx) o di testo, oppure incolla il testo qui sotto. Scomic riconosce tavole, vignette, intestazioni come
          &quot;EST. PORTO — NOTTE&quot;, battute (&quot;MARCO: …&quot;), didascalie e SFX.
        </p>

        <div className="import-source">
          <button type="button" className="btn primary" onClick={() => fileRef.current?.click()} disabled={loading}>
            {loading ? 'Lettura…' : 'Scegli un file…'}
          </button>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".docx,.txt,.md,.text,.doc,.html,.htm"
            onChange={(e) => {
              void chooseFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <span className="muted small">{fileName || 'Word (.docx), testo (.txt, .md)'}</span>
        </div>
        {error && <div className="status bad">{error}</div>}

        <label className="import-label" htmlFor="import-text">
          Testo della sceneggiatura
        </label>
        <textarea
          id="import-text"
          className="import-text"
          value={text}
          placeholder={EXAMPLE}
          onChange={(e) => {
            setText(e.target.value);
            setFileName('');
          }}
          spellCheck={false}
        />

        {s && resolved && result && (
          <div className="import-preview">
            <div className="import-stats">
              <span>
                <b>{s.pages}</b> {s.pages === 1 ? 'tavola' : 'tavole'}
              </span>
              <span>
                <b>{s.panels}</b> {s.panels === 1 ? 'vignetta' : 'vignette'}
              </span>
              <span>
                <b>{s.elements}</b> tra battute, didascalie e SFX
              </span>
            </div>
            <div className="import-thumbs" aria-hidden="true">
              {result.project.pages.slice(0, 12).map((p) => (
                <span key={p.id} className="import-thumb">
                  <MiniLayout rows={pageRows(p, resolved.byPage[p.id])} />
                </span>
              ))}
              {result.project.pages.length > 12 && <span className="muted small">+{result.project.pages.length - 12}</span>}
            </div>
            <p className="small">
              <b>Personaggi:</b> {s.characters.length ? s.characters.join(', ') : 'nessuno trovato'}
              <br />
              <b>Luoghi:</b> {s.places.length ? s.places.join(', ') : 'nessuno trovato'}
            </p>
            {s.skipped.length > 0 && (
              <details className="small">
                <summary>
                  {s.skipped.length} {s.skipped.length === 1 ? 'riga' : 'righe'} prima della prima tavola non {s.skipped.length === 1 ? 'è stata importata' : 'sono state importate'}
                </summary>
                <ul>
                  {s.skipped.slice(0, 20).map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <details className="small import-help">
          <summary>Come scrivere il testo perché venga riconosciuto</summary>
          <pre>{EXAMPLE}</pre>
          <p>
            Vanno bene anche: PAGINA / PAG. / TAV. per le tavole, VIG. 1 o VIGNETTA 1.2 per le vignette, STRISCIA 1 per le strisce, &quot;Luce:&quot; e
            &quot;Inquadratura:&quot; su righe proprie, il nome del personaggio da solo su una riga con la battuta sotto. Tra parentesi dopo il nome:
            pensiero, sussurro, urlo, fuori campo. Il resto del testo diventa descrizione della vignetta.
          </p>
        </details>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={close}>
            Annulla
          </button>
          <button type="button" className="btn" disabled={!result} onClick={importAppend}>
            Aggiungi in fondo al progetto
          </button>
          <button type="button" className="btn primary" disabled={!result} onClick={() => void importAsNew()}>
            Importa come nuovo progetto
          </button>
        </div>
      </div>
    </div>
  );
}
