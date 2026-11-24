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
}

export const useUi = create<UiState>(() => ({ confirm: null, notice: null, importOpen: false }));

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
