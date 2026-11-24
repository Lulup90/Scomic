import { useEffect } from 'react';
import { Menabo } from './components/Menabo';
import { ImportDialog } from './components/ImportDialog';
import { Overlays } from './components/Overlays';
import { ShareDialog } from './components/ShareDialog';
import { StoryWindows } from './components/StoryWindows';
import { initFileLink, save, unlink } from './io/fileLink';
import { clearIncoming, readIncoming } from './io/share';
import { askConfirm, notify } from './store/ui';

/** Apertura da un link di condivisione: chiede conferma prima di sostituire il progetto aperto. */
async function handleIncoming() {
  let incoming;
  try {
    incoming = await readIncoming(location.hash);
  } catch (e) {
    clearIncoming();
    notify(e instanceof Error ? e.message : 'Il link del progetto non è valido o è incompleto.');
    return;
  }
  if (!incoming) return;
  const current = useStore.getState().project;
  const ok = await askConfirm(
    `Hai ricevuto il progetto "${incoming.title}" (${incoming.pages.length} ${incoming.pages.length === 1 ? 'tavola' : 'tavole'}). Vuoi aprirlo? Il progetto aperto ora ("${current.title}") verrà chiuso: se ti serve, annulla, salvalo su file e poi riapri il link.`,
    'Apri il progetto ricevuto',
  );
  if (!ok) return;
  clearIncoming();
  unlink();
  useStore.getState().loadProject(incoming);
  notify(`Aperto "${incoming.title}". Salvalo su file per tenerne una copia.`);
}
import { PagePreview } from './components/PagePreview';
import { PrintView } from './components/PrintView';
import { ScriptPage } from './components/ScriptPage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useStore } from './store/store';

export function App() {
  const view = useStore((s) => s.view);

  useEffect(() => {
    void initFileLink().then(handleIncoming);
    const onHash = () => void handleIncoming();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Annulla / ripeti / salva da tastiera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        void save();
      } else if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        useStore.getState().undo();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        useStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <TopBar />
      {view === 'scrivi' && (
        <div className="workspace">
          <Sidebar />
          <div className="work-main">
            <ScriptPage />
            <PagePreview />
          </div>
        </div>
      )}
      {view === 'menabo' && <Menabo />}
      {view === 'stampa' && <PrintView />}
      <StoryWindows />
      <ImportDialog />
      <ShareDialog />
      <Overlays />
    </div>
  );
}
