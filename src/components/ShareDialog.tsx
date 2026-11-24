import { useEffect, useRef, useState } from 'react';
import { fileSafeName } from '../io/exporters';
import { saveFile } from '../io/platform';
import { LONG_LINK, shareLink } from '../io/share';
import { useStore } from '../store/store';
import { notify, openShare, useUi } from '../store/ui';
import { IconClose } from './icons';

/** Passare il progetto a un'altra persona: link, file o versione da leggere. */
export function ShareDialog() {
  const open = useUi((s) => s.shareOpen);
  const project = useStore((s) => s.project);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setCopied(false);
    setLink('');
    shareLink(project)
      .then((l) => alive && setLink(l))
      .catch(() => alive && setLink(''));
    return () => {
      alive = false;
    };
  }, [open, project]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') openShare(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const close = () => openShare(false);
  const fileName = `${fileSafeName(project.title)}.scomic.json`;
  const json = JSON.stringify(project, null, 2);
  const file = typeof File === 'function' ? new File([json], fileName, { type: 'application/json' }) : null;
  const canShareFile = !!file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  const long = link.length > LONG_LINK;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Copia non permessa: seleziona il testo così si può copiare a mano
      linkRef.current?.focus();
      linkRef.current?.select();
      notify('Il testo del link è selezionato: copialo con Ctrl+C.');
    }
  }

  async function shareFile() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: project.title, text: `Il progetto "${project.title}" da aprire con Scomic` });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) notify('Invio non riuscito: scarica il file e allegalo.');
    }
  }

  async function downloadFile() {
    const r = await saveFile(fileName, json, 'application/json');
    if (r === 'unavailable') notify('Qui non è possibile scaricare file: usa il link.');
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal share-modal" role="dialog" aria-modal="true" aria-labelledby="share-title" onMouseDown={(e) => e.stopPropagation()}>
        <div className="import-head">
          <h2 id="share-title">Passa il progetto a un&apos;altra persona</h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Chiudi" onClick={close}>
            <IconClose />
          </button>
        </div>
        <p className="muted">
          Chi riceve il progetto ne ottiene una copia: può leggerla e modificarla in Scomic, e le sue modifiche non cambiano la tua. Per avere indietro le
          modifiche, fatti rimandare il link o il file.
        </p>

        <section className="share-block">
          <h3>Con un link</h3>
          <p className="small muted">
            Il link contiene tutto il progetto: chi lo apre se lo trova in Scomic, senza installare niente. Il progetto non passa da nessun server, ma chiunque
            abbia il link può leggerlo: mandalo solo a chi vuoi.
          </p>
          <label className="import-label" htmlFor="share-link">
            Link del progetto ({link ? `${Math.round(link.length / 1000) || 1} mila caratteri` : 'preparazione…'})
          </label>
          <textarea id="share-link" ref={linkRef} className="share-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} rows={3} />
          <div className="share-actions">
            <button type="button" className="btn primary" disabled={!link} onClick={() => void copy()}>
              {copied ? 'Link copiato' : 'Copia il link'}
            </button>
            {copied && <span className="small muted">Incollalo in un messaggio o in una email.</span>}
          </div>
          {long && (
            <div className="status bad">
              Il progetto è grande e il link è molto lungo: alcune app di messaggi potrebbero tagliarlo. Se chi lo riceve non riesce ad aprirlo, manda il file.
            </div>
          )}
        </section>

        <section className="share-block">
          <h3>Con il file del progetto</h3>
          <p className="small muted">
            Allegalo a una email o mandalo in chat. Chi lo riceve lo apre da Scomic con <b>File → Apri progetto</b>.
          </p>
          <div className="share-actions">
            {canShareFile && (
              <button type="button" className="btn primary" onClick={() => void shareFile()}>
                Invia con…
              </button>
            )}
            <button type="button" className="btn" onClick={() => void downloadFile()}>
              Scarica {fileName}
            </button>
          </div>
        </section>

        <section className="share-block">
          <h3>Solo da leggere</h3>
          <p className="small muted">Per chi non usa Scomic (editore, disegnatore): la sceneggiatura in Word o PDF.</p>
          <div className="share-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                close();
                useStore.getState().setView('stampa');
              }}
            >
              Vai a Stampa ed esporta
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
