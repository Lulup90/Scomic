import { useEffect, useRef } from 'react';
import { countWords } from '../model/resolve';
import { setMeta } from '../store/actions';
import { useStore } from '../store/store';
import { useUi } from '../store/ui';
import { FloatingWindow } from './FloatingWindow';

/** Una cartella editoriale: 1800 battute, spazi compresi. */
const CARTELLA = 1800;

export function StoryWindows() {
  const windows = useUi((s) => s.windows);
  return (
    <>
      {windows.includes('logline') && <LoglineWindow />}
      {windows.includes('soggetto') && <SoggettoWindow />}
    </>
  );
}

function useAutofocus() {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);
  return ref;
}

function LoglineWindow() {
  const logline = useStore((s) => s.project.logline);
  const ref = useAutofocus();
  const words = countWords(logline);
  return (
    <FloatingWindow
      id="logline"
      title="Logline"
      initial={{ x: 280, y: 90, w: 480, h: 260 }}
      footer={
        <>
          <span>
            {words} {words === 1 ? 'parola' : 'parole'} · {logline.length} caratteri
          </span>
          {words > 50 && <span className="warn-text">Una logline di solito sta sotto le 50 parole.</span>}
        </>
      }
    >
      <textarea
        ref={ref}
        className="story-text logline-text"
        aria-label="Logline"
        placeholder="La storia in una o due frasi: chi è il protagonista, cosa vuole, cosa glielo impedisce."
        value={logline}
        onChange={(e) => setMeta('logline', e.target.value)}
      />
    </FloatingWindow>
  );
}

function SoggettoWindow() {
  const soggetto = useStore((s) => s.project.soggetto);
  const ref = useAutofocus();
  const words = countWords(soggetto);
  const cartelle = soggetto.length / CARTELLA;
  return (
    <FloatingWindow
      id="soggetto"
      title="Soggetto"
      initial={{ x: 320, y: 140, w: 600, h: 480 }}
      footer={
        <span>
          {words} {words === 1 ? 'parola' : 'parole'} · {cartelle < 0.1 ? 'meno di 0,1' : (Math.round(cartelle * 10) / 10).toString().replace('.', ',')}{' '}
          {cartelle >= 0.95 && cartelle < 1.05 ? 'cartella' : 'cartelle'} (1800 battute)
        </span>
      }
    >
      <textarea
        ref={ref}
        className="story-text soggetto-text"
        aria-label="Soggetto"
        placeholder="La trama per esteso: ambientazione, personaggi, cosa succede dall'inizio alla fine."
        value={soggetto}
        onChange={(e) => setMeta('soggetto', e.target.value)}
      />
    </FloatingWindow>
  );
}
