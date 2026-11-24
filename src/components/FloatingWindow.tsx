import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { closeWindow, openWindow, useUi, type WindowId } from '../store/ui';
import { IconClose } from './icons';

interface Geometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  id: WindowId;
  title: string;
  initial: Geometry;
  children: ReactNode;
  footer?: ReactNode;
}

const MIN_W = 300;
const MIN_H = 180;

function load(id: string, fallback: Geometry): Geometry {
  try {
    const raw = localStorage.getItem(`scomic.finestra.${id}`);
    if (raw) {
      const g = JSON.parse(raw) as Geometry;
      if ([g.x, g.y, g.w, g.h].every((n) => typeof n === 'number' && Number.isFinite(n))) return g;
    }
  } catch {
    // posizione non disponibile: si usa quella predefinita
  }
  return fallback;
}

function clamp(g: Geometry): Geometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(Math.max(g.w, MIN_W), vw - 16);
  const h = Math.min(Math.max(g.h, MIN_H), vh - 16);
  return {
    w,
    h,
    x: Math.min(Math.max(g.x, 8), vw - w - 8),
    y: Math.min(Math.max(g.y, 8), vh - h - 8),
  };
}

/** Finestra che si sposta trascinando la barra del titolo e si ridimensiona dall'angolo. */
export function FloatingWindow({ id, title, initial, children, footer }: Props) {
  const order = useUi((s) => s.windows);
  const [geo, setGeo] = useState<Geometry>(() => load(id, initial));
  const ref = useRef<HTMLDivElement>(null);
  const z = 40 + order.indexOf(id);
  const front = order[order.length - 1] === id;

  // Tiene la finestra dentro lo schermo
  useLayoutEffect(() => {
    setGeo((g) => clamp(g));
    const onResize = () => setGeo((g) => clamp(g));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Ricorda posizione e dimensioni
  useEffect(() => {
    try {
      localStorage.setItem(`scomic.finestra.${id}`, JSON.stringify(geo));
    } catch {
      // non importante
    }
  }, [id, geo]);

  // Dimensioni cambiate trascinando l'angolo (resize del CSS)
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (window.innerWidth < 700) return; // su telefono la finestra occupa la parte bassa dello schermo
      setGeo((g) => (Math.abs(g.w - r.width) > 1 || Math.abs(g.h - r.height) > 1 ? { ...g, w: r.width, h: r.height } : g));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  function startDrag(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button')) return;
    if (window.innerWidth < 700) return;
    e.preventDefault();
    openWindow(id);
    const bar = e.currentTarget;
    bar.setPointerCapture(e.pointerId);
    const sx = e.clientX;
    const sy = e.clientY;
    const start = geo;
    const move = (ev: globalThis.PointerEvent) => setGeo(clamp({ ...start, x: start.x + ev.clientX - sx, y: start.y + ev.clientY - sy }));
    const up = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  }

  return (
    <div
      ref={ref}
      className={`float-window${front ? ' front' : ''}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`win-${id}-title`}
      style={{ left: geo.x, top: geo.y, width: geo.w, height: geo.h, zIndex: z }}
      onPointerDownCapture={() => !front && openWindow(id)}
      onFocusCapture={() => !front && openWindow(id)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          closeWindow(id);
        }
      }}
    >
      <div className="float-bar" onPointerDown={startDrag}>
        <h2 id={`win-${id}-title`}>{title}</h2>
        <button type="button" className="icon-btn" aria-label={`Chiudi ${title}`} onClick={() => closeWindow(id)}>
          <IconClose size={14} />
        </button>
      </div>
      <div className="float-body">{children}</div>
      {footer && <div className="float-footer">{footer}</div>}
    </div>
  );
}
