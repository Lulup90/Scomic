import { useEffect } from 'react';
import { Menabo } from './components/Menabo';
import { Overlays } from './components/Overlays';
import { PagePreview } from './components/PagePreview';
import { PrintView } from './components/PrintView';
import { ScriptPage } from './components/ScriptPage';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { useStore } from './store/store';

export function App() {
  const view = useStore((s) => s.view);

  // Annulla / ripeti da tastiera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
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
      <Overlays />
    </div>
  );
}
