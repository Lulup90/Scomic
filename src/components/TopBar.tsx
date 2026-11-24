import { useEffect, useRef, useState } from 'react';
import { emptyProject, sampleProject } from '../model/factory';
import { fmtNum } from '../model/formats';
import { canLinkFiles, openFile, reconnect, save, saveAs, unlink, useFileLink } from '../io/fileLink';
import { install, useInstall } from '../io/pwa';
import { setMeta, setThreshold } from '../store/actions';
import { useStore, type View } from '../store/store';
import { askConfirm, openImport, openShare } from '../store/ui';
import { IconLogo, IconRedo, IconUndo } from './icons';

const VIEWS: { key: View; label: string }[] = [
  { key: 'scrivi', label: 'Scrittura' },
  { key: 'menabo', label: 'Menabò' },
  { key: 'stampa', label: 'Stampa ed esporta' },
];

export function TopBar() {
  const project = useStore((s) => s.project);
  const view = useStore((s) => s.view);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const linkable = canLinkFiles();
  const installable = useInstall((s) => s.prompt !== null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const run = (fn: () => void) => () => {
    setMenu(false);
    fn();
  };

  return (
    <header className="topbar">
      <div className="brand">
        <IconLogo />
        <span>Scomic</span>
      </div>
      <div className="project-meta">
        <input className="title-input" aria-label="Titolo della storia" value={project.title} onChange={(e) => setMeta('title', e.target.value)} />
        <span className="saved">
          <input className="subtitle-input" aria-label="Sottotitolo (es. numero dell'albo)" placeholder="Albo / episodio" value={project.subtitle} onChange={(e) => setMeta('subtitle', e.target.value)} />
          <SaveStatus />
        </span>
      </div>

      <nav className="views" aria-label="Viste">
        {VIEWS.map((v) => (
          <button key={v.key} type="button" aria-current={view === v.key ? 'page' : undefined} onClick={() => useStore.getState().setView(v.key)}>
            {v.label}
          </button>
        ))}
      </nav>

      <div className="top-actions">
        <button type="button" className="icon-btn dark" aria-label="Annulla (Ctrl+Z)" title="Annulla (Ctrl+Z)" disabled={!canUndo} onClick={() => useStore.getState().undo()}>
          <IconUndo />
        </button>
        <button type="button" className="icon-btn dark" aria-label="Ripeti (Ctrl+Y)" title="Ripeti (Ctrl+Y)" disabled={!canRedo} onClick={() => useStore.getState().redo()}>
          <IconRedo />
        </button>
        <button type="button" className="btn dark" onClick={() => openShare()}>
          Condividi
        </button>
        <div className="menu" ref={menuRef}>
          <button type="button" className="btn dark" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((m) => !m)}>
            File
          </button>
          {menu && (
            <div className="menu-list" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={run(async () => {
                  if (await askConfirm('Iniziare un nuovo progetto? Quello aperto verrà chiuso: salvalo prima su file se vuoi conservarlo.', 'Nuovo progetto', true)) {
                    unlink();
                    useStore.getState().loadProject(emptyProject());
                  }
                })}
              >
                Nuovo progetto
              </button>
              <button type="button" role="menuitem" onClick={run(() => void openFile())}>
                Apri progetto…
              </button>
              <button type="button" role="menuitem" onClick={run(() => openImport())}>
                Importa da Word o testo…
              </button>
              <button type="button" role="menuitem" onClick={run(() => openShare())}>
                Passa a un&apos;altra persona…
              </button>
              <hr />
              <button type="button" role="menuitem" className="menu-row" onClick={run(() => void save())}>
                <span>Salva</span>
                <kbd>Ctrl+S</kbd>
              </button>
              {linkable && (
                <button type="button" role="menuitem" onClick={run(() => void saveAs())}>
                  Salva con nome…
                </button>
              )}
              <hr />
              <button
                type="button"
                role="menuitem"
                onClick={run(async () => {
                  if (await askConfirm('Caricare la storia d’esempio? Il progetto aperto verrà chiuso.', 'Carica l’esempio', true)) {
                    unlink();
                    useStore.getState().loadProject(sampleProject());
                  }
                })}
              >
                Carica l&apos;esempio
              </button>
              {installable && (
                <button type="button" role="menuitem" onClick={run(() => void install())}>
                  Installa Scomic come app
                </button>
              )}
              <hr />
              <label className="menu-setting">
                <span>Soglia &quot;troppo testo&quot;</span>
                <span className="muted small">parole per ogni 1% di tavola: {fmtNum(project.densityThreshold)}</span>
                <input type="range" min={0.5} max={5} step={0.25} value={project.densityThreshold} onChange={(e) => setThreshold(Number(e.target.value))} />
              </label>
              <label className="menu-setting">
                <span>Autore</span>
                <input value={project.author} onChange={(e) => setMeta('author', e.target.value)} placeholder="Nome dello sceneggiatore" />
              </label>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const time = (t: number) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

/** Dove è al sicuro il lavoro: file collegato, solo nel browser, ecc. */
function SaveStatus() {
  const { name, status, savedAt, pending } = useFileLink();

  if (status === 'needs-permission' && name) {
    return (
      <button type="button" className="save-status warn" onClick={() => void reconnect()} title="Il browser chiede di nuovo il permesso di scrivere nel file">
        <span className="dot" aria-hidden="true" />
        Ricollega {name}
      </button>
    );
  }
  if (status === 'error' && name) {
    return (
      <button type="button" className="save-status warn" onClick={() => void save()}>
        <span className="dot" aria-hidden="true" />
        Errore nel salvare {name}: riprova
      </button>
    );
  }
  if (name) {
    return (
      <span className="save-status ok" aria-live="polite" title={`Ogni modifica viene salvata in ${name}`}>
        <span className="dot" aria-hidden="true" />
        {status === 'saving' ? 'Salvataggio…' : `${name}${savedAt ? ` · salvato alle ${time(savedAt)}` : ''}`}
      </span>
    );
  }
  const unsaved = pending > 0;
  return (
    <button
      type="button"
      className={`save-status ${pending >= 15 ? 'warn' : 'neutral'}`}
      onClick={() => void save()}
      title="Il progetto è salvato in questo browser. Clicca per salvarlo anche su file."
    >
      <span className="dot" aria-hidden="true" />
      {savedAt
        ? `File salvato alle ${time(savedAt)}${unsaved ? ' · ci sono modifiche nuove' : ''}`
        : unsaved
          ? 'Solo nel browser · salva su file'
          : 'Salvato nel browser'}
    </button>
  );
}
