import { useEffect, useRef } from 'react';
import { useUi } from '../store/ui';

/** Finestra di conferma e avvisi brevi. */
export function Overlays() {
  const confirm = useUi((s) => s.confirm);
  const notice = useUi((s) => s.notice);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirm) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') confirm.resolve(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm]);

  return (
    <>
      {confirm && (
        <div className="modal-backdrop" onMouseDown={() => confirm.resolve(false)}>
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-msg" onMouseDown={(e) => e.stopPropagation()}>
            <p id="confirm-msg">{confirm.message}</p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => confirm.resolve(false)}>
                Annulla
              </button>
              <button ref={okRef} type="button" className={`btn primary${confirm.danger ? ' danger' : ''}`} onClick={() => confirm.resolve(true)}>
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="toast-area" aria-live="polite">
        {notice && <div className="toast">{notice}</div>}
      </div>
    </>
  );
}
