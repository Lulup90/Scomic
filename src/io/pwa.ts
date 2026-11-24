// App installabile: registra il service worker (uso senza internet) e tiene pronta
// la richiesta di installazione del browser per il menu File.
import { create } from 'zustand';
import { IS_ARTIFACT } from './platform';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const useInstall = create<{ prompt: InstallPromptEvent | null; installed: boolean }>(() => ({ prompt: null, installed: false }));

export function initPwa(): void {
  // Solo nella versione pubblicata sul sito: non nel file singolo né nelle pagine claude.ai
  if (IS_ARTIFACT || import.meta.env.MODE !== 'production' || typeof window === 'undefined') return;
  if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // senza service worker l'app funziona comunque, solo non offline
    });
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    useInstall.setState({ prompt: e as InstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => useInstall.setState({ prompt: null, installed: true }));
}

export async function install(): Promise<void> {
  const p = useInstall.getState().prompt;
  if (!p) return;
  await p.prompt();
  await p.userChoice.catch(() => undefined);
  useInstall.setState({ prompt: null });
}
