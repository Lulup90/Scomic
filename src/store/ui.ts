import { create } from 'zustand';

interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

interface UiState {
  confirm: ConfirmRequest | null;
  notice: string | null;
  importOpen: boolean;
  shareOpen: boolean;
  /** Finestre aperte (logline, soggetto), dalla più in basso alla più in alto. */
  windows: WindowId[];
}

export type WindowId = 'logline' | 'soggetto';

export const useUi = create<UiState>(() => ({ confirm: null, notice: null, importOpen: false, shareOpen: false, windows: [] }));

/** Apre una finestra (o la porta davanti se è già aperta). */
export function openWindow(id: WindowId) {
  useUi.setState((s) => ({ windows: [...s.windows.filter((w) => w !== id), id] }));
}

export function closeWindow(id: WindowId) {
  useUi.setState((s) => ({ windows: s.windows.filter((w) => w !== id) }));
}

export function toggleWindow(id: WindowId) {
  const open = useUi.getState().windows;
  // Se è aperta ma dietro un'altra, il clic la porta davanti; se è già davanti, la chiude
  if (open[open.length - 1] === id) closeWindow(id);
  else openWindow(id);
}

export function openShare(open = true) {
  useUi.setState({ shareOpen: open });
}

export function openImport(open = true) {
  useUi.setState({ importOpen: open });
}

/**
 * Chiede conferma con una finestra dentro l'app (al posto di window.confirm,
 * che non funziona ovunque e non si può personalizzare).
 */
export function askConfirm(message: string, confirmLabel = 'Conferma', danger = false): Promise<boolean> {
  return new Promise((resolve) => {
    useUi.getState().confirm?.resolve(false);
    useUi.setState({
      confirm: {
        message,
        confirmLabel,
        danger,
        resolve: (ok) => {
          useUi.setState({ confirm: null });
          resolve(ok);
        },
      },
    });
  });
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined;

/** Messaggio breve in basso allo schermo. */
export function notify(message: string) {
  clearTimeout(noticeTimer);
  useUi.setState({ notice: message });
  noticeTimer = setTimeout(() => useUi.setState({ notice: null }), 4000);
}
