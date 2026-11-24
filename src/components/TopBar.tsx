import { useEffect, useRef, useState } from 'react';
import { emptyProject, sampleProject } from '../model/factory';
import { fmtNum } from '../model/formats';
import { openProjectFile } from '../io/files';
import { fileSafeName } from '../io/exporters';
import { saveFile } from '../io/platform';
import { setMeta, setThreshold } from '../store/actions';
import { useStore, type View } from '../store/store';
import { askConfirm, notify } from '../store/ui';
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
  const savedAt = useStore((s) => s.savedAt);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          <span aria-live="polite">{savedAt ? '· salvato nel browser' : ''}</span>
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
                  if (await askConfirm('Iniziare un nuovo progetto? Il progetto attuale verrà sostituito: salvalo prima su file se vuoi conservarlo.', 'Nuovo progetto', true))
                    useStore.getState().loadProject(emptyProject());
                })}
              >
                Nuovo progetto
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={run(async () => {
                  try {
                    const p = await openProjectFile();
                    useStore.getState().loadProject(p);
                    notify(`Aperto "${p.title}".`);
                  } catch (e) {
                    if (e instanceof Error && e.message !== 'Nessun file scelto.') notify(e.message);
                  }
                })}
              >
                Apri file…
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={run(async () => {
                  const r = await saveFile(`${fileSafeName(project.title)}.scomic.json`, JSON.stringify(project, null, 2), 'application/json');
                  if (r === 'unavailable') notify('Qui non è possibile salvare file. Il progetto resta salvato in questo browser.');
                })}
              >
                Salva su file
              </button>
              <hr />
              <button
                type="button"
                role="menuitem"
                onClick={run(async () => {
                  if (await askConfirm('Caricare la storia d’esempio? Il progetto attuale verrà sostituito.', 'Carica l’esempio', true))
                    useStore.getState().loadProject(sampleProject());
                })}
              >
                Carica l&apos;esempio
              </button>
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
