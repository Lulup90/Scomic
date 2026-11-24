import { useEffect, type RefObject } from 'react';
import { useStore } from '../store/store';

/** Porta il focus sull'elemento quando un'azione lo richiede (es. nuova vignetta → descrizione). */
export function useFocusRequest(id: string, ref: RefObject<HTMLElement>) {
  const focusId = useStore((s) => s.focusId);
  useEffect(() => {
    if (focusId === id && ref.current) {
      ref.current.focus();
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      useStore.getState().requestFocus(null);
    }
  }, [focusId, id, ref]);
}
