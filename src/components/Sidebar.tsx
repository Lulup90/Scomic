import { useState } from 'react';
import { characterLines, placeUses } from '../model/resolve';
import {
  addPage,
  deleteCharacter,
  deletePage,
  deletePlace,
  duplicatePage,
  ensureCharacter,
  ensurePlace,
  movePage,
  renameCharacter,
  renamePlace,
  setCharacterNotes,
} from '../store/actions';
import { useResolved } from '../store/derived';
import { useStore } from '../store/store';
import { askConfirm } from '../store/ui';
import { IconCopy, IconDown, IconPlus, IconTrash, IconUp, IconWarn } from './icons';

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function Sidebar() {
  // Su schermi stretti la colonna parte chiusa per lasciare spazio alla scrittura
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 900);
  return (
    <aside className={`sidebar${open ? '' : ' closed'}`} aria-label="Struttura e archivio">
      <button type="button" className="sidebar-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? 'Nascondi tavole e archivio' : 'Mostra tavole e archivio'}
      </button>
      {open && (
        <>
          <PageTree />
          <Archive />
        </>
      )}
    </aside>
  );
}

function PageTree() {
  const project = useStore((s) => s.project);
  const pageId = useStore((s) => s.pageId);
  const panelId = useStore((s) => s.panelId);
  const resolved = useResolved();

  return (
    <section className="side-section">
      <div className="side-head">
        <h2>Tavole</h2>
        <button type="button" className="icon-btn" aria-label="Aggiungi tavola" title="Nuova tavola dopo quella aperta" onClick={() => addPage(pageId)}>
          <IconPlus size={14} />
        </button>
      </div>
      <ol className="tree">
        {project.pages.map((page, i) => {
          const rp = resolved.byPage[page.id];
          const open = page.id === pageId;
          const empty = rp.words === 0 && page.strips.every((s) => s.panels.every((p) => !p.description.trim()));
          return (
            <li key={page.id} className={open ? 'open' : undefined}>
              <button type="button" className="tree-page" aria-current={open ? 'page' : undefined} onClick={() => useStore.getState().selectPage(page.id)}>
                <span>Tavola {i + 1}</span>
                <span className="tree-meta">
                  {rp.denseCount > 0 && (
                    <span className="tree-warn" title={`${rp.denseCount} vignette con troppo testo`}>
                      <IconWarn size={12} />
                    </span>
                  )}
                  {empty ? 'vuota' : `${rp.panels.length} vign.`}
                </span>
              </button>
              {open && (
                <>
                  <div className="tree-tools">
                    <button type="button" className="icon-btn" aria-label="Sposta tavola prima" disabled={i === 0} onClick={() => movePage(page.id, -1)}>
                      <IconUp size={14} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Sposta tavola dopo" disabled={i === project.pages.length - 1} onClick={() => movePage(page.id, 1)}>
                      <IconDown size={14} />
                    </button>
                    <button type="button" className="icon-btn" aria-label="Duplica tavola" onClick={() => duplicatePage(page.id)}>
                      <IconCopy size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Elimina tavola"
                      disabled={project.pages.length === 1}
                      onClick={async () => {
                        if (await askConfirm(`Eliminare la tavola ${i + 1} con tutto il suo testo?`, 'Elimina', true)) deletePage(page.id);
                      }}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                  <div className="tree-strips">
                    {page.strips.map((s, si) => (
                      <div key={s.id} className="tree-strip">
                        <span className="tree-strip-label">Striscia {si + 1}</span>
                        {s.panels.map((p) => {
                          const r = resolved.byPanel[p.id];
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={`tree-panel${p.id === panelId ? ' active' : ''}`}
                              onClick={() => {
                                useStore.getState().selectPanel(p.id);
                                useStore.getState().requestFocus(`card:${p.id}`);
                              }}
                            >
                              Vignetta {r.number}
                              {r.dense && <IconWarn size={11} />}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Archive() {
  const project = useStore((s) => s.project);
  const lines = characterLines(project);
  const uses = placeUses(project);
  const [newChar, setNewChar] = useState('');
  const [newPlace, setNewPlace] = useState('');

  return (
    <section className="side-section">
      <div className="side-head">
        <h2>Personaggi</h2>
      </div>
      <ul className="archive">
        {project.characters.map((c) => (
          <ArchiveItem
            key={c.id}
            name={c.name}
            meta={plural(lines[c.name.toLowerCase()] ?? 0, 'battuta', 'battute')}
            notes={c.notes}
            onNotes={(n) => setCharacterNotes(c.id, n)}
            onRename={(n) => renameCharacter(c.id, n)}
            canDelete={!lines[c.name.toLowerCase()]}
            onDelete={() => deleteCharacter(c.id)}
          />
        ))}
      </ul>
      <form
        className="archive-add"
        onSubmit={(e) => {
          e.preventDefault();
          ensureCharacter(newChar);
          setNewChar('');
        }}
      >
        <input value={newChar} onChange={(e) => setNewChar(e.target.value)} placeholder="Nuovo personaggio" aria-label="Nuovo personaggio" />
        <button type="submit" className="icon-btn" aria-label="Aggiungi personaggio" disabled={!newChar.trim()}>
          <IconPlus size={14} />
        </button>
      </form>

      <div className="side-head" style={{ marginTop: 18 }}>
        <h2>Luoghi</h2>
      </div>
      <ul className="archive">
        {project.places.map((p) => (
          <ArchiveItem
            key={p.id}
            name={p.name}
            meta={plural(uses[p.name.toLowerCase()] ?? 0, 'vignetta', 'vignette')}
            onRename={(n) => renamePlace(p.id, n)}
            canDelete={!uses[p.name.toLowerCase()]}
            onDelete={() => deletePlace(p.id)}
          />
        ))}
      </ul>
      <form
        className="archive-add"
        onSubmit={(e) => {
          e.preventDefault();
          ensurePlace(newPlace);
          setNewPlace('');
        }}
      >
        <input value={newPlace} onChange={(e) => setNewPlace(e.target.value)} placeholder="Nuovo luogo" aria-label="Nuovo luogo" />
        <button type="submit" className="icon-btn" aria-label="Aggiungi luogo" disabled={!newPlace.trim()}>
          <IconPlus size={14} />
        </button>
      </form>
      <p className="side-note">Rinomina un nome qui: cambia in tutta la sceneggiatura.</p>
    </section>
  );
}

interface ItemProps {
  name: string;
  meta: string;
  notes?: string;
  onNotes?: (n: string) => void;
  onRename: (n: string) => void;
  canDelete: boolean;
  onDelete: () => void;
}

function ArchiveItem({ name, meta, notes, onNotes, onRename, canDelete, onDelete }: ItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (editing) {
    return (
      <li className="archive-item editing">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim() && draft.trim() !== name) onRename(draft);
            setEditing(false);
          }}
        >
          <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Nuovo nome per ${name}`} />
          {onNotes && (
            <textarea value={notes} rows={2} placeholder="Note (aspetto, carattere…)" aria-label={`Note su ${name}`} onChange={(e) => onNotes(e.target.value)} />
          )}
          <div className="archive-edit-tools">
            <button type="submit" className="btn small primary">
              Salva
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                setDraft(name);
                setEditing(false);
              }}
            >
              Annulla
            </button>
            <button type="button" className="icon-btn" aria-label={`Elimina ${name}`} disabled={!canDelete} title={canDelete ? 'Elimina' : 'È usato nella sceneggiatura'} onClick={onDelete}>
              <IconTrash size={14} />
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="archive-item">
      <button
        type="button"
        className="archive-name"
        title={notes || 'Clicca per rinominare'}
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
      >
        <span>{name}</span>
        <span className="muted small">{meta}</span>
      </button>
    </li>
  );
}
