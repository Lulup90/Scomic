// Operazioni sulla geometria della tavola: strisce (altezze %) e vignette (larghezze %).
import { uid } from './id';
import type { Page, Panel, Strip } from './types';

export const MIN_SIZE = 8; // percentuale minima per una vignetta o una striscia

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Ridimensiona l'elemento `index` portandolo a `value`, togliendo/aggiungendo lo spazio
 * al vicino (`neighbor`, di default quello successivo, o il precedente se è l'ultimo).
 * La somma dei due resta costante. Restituisce una nuova lista.
 */
export function resizePair(values: number[], index: number, value: number, neighbor?: number): number[] {
  const out = values.slice();
  const j = neighbor ?? (index < values.length - 1 ? index + 1 : index - 1);
  if (j < 0 || j >= values.length || j === index) return out;
  const total = values[index] + values[j];
  const v = clamp(round1(value), MIN_SIZE, total - MIN_SIZE);
  out[index] = v;
  out[j] = round1(total - v);
  return out;
}

/** Riporta la somma a 100 mantenendo le proporzioni. */
export function normalize(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (values.length === 0) return [];
  if (sum <= 0) return values.map(() => round1(100 / values.length));
  const out = values.map((v) => round1((v / sum) * 100));
  // Corregge l'errore di arrotondamento sull'ultimo valore
  const diff = round1(100 - out.reduce((a, b) => a + b, 0));
  out[out.length - 1] = round1(out[out.length - 1] + diff);
  return out;
}

export function equal(n: number): number[] {
  return normalize(Array.from({ length: n }, () => 1));
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function newPanel(width = 100): Panel {
  return { id: uid('v'), width, fields: {}, description: '', elements: [] };
}

export function newStrip(height = 100, panels: Panel[] = [newPanel()]): Strip {
  return { id: uid('s'), height, panels };
}

export function newPage(): Page {
  return { id: uid('t'), notes: '', strips: [newStrip()] };
}

/** Aggiunge una vignetta in fondo alla striscia, ridistribuendo le larghezze in parti uguali. */
export function addPanelToStrip(strip: Strip, afterIndex?: number): Panel {
  const p = newPanel();
  const at = afterIndex === undefined ? strip.panels.length : afterIndex + 1;
  strip.panels.splice(at, 0, p);
  const widths = equal(strip.panels.length);
  strip.panels.forEach((x, i) => (x.width = widths[i]));
  return p;
}

/** Aggiunge una striscia (con una vignetta) dopo `afterIndex`; le altre si riducono in proporzione. */
export function addStripToPage(page: Page, afterIndex?: number): Strip {
  const n = page.strips.length;
  const newH = 100 / (n + 1);
  page.strips.forEach((s) => (s.height = s.height * (n / (n + 1))));
  const s = newStrip(newH);
  const at = afterIndex === undefined ? n : afterIndex + 1;
  page.strips.splice(at, 0, s);
  const hs = normalize(page.strips.map((x) => x.height));
  page.strips.forEach((x, i) => (x.height = hs[i]));
  return s;
}

/** Rimuove una vignetta; se la striscia resta vuota rimuove anche la striscia. */
export function removePanel(page: Page, panelId: string): boolean {
  for (let si = 0; si < page.strips.length; si++) {
    const strip = page.strips[si];
    const pi = strip.panels.findIndex((p) => p.id === panelId);
    if (pi < 0) continue;
    if (strip.panels.length === 1) {
      if (page.strips.length === 1) return false; // l'ultima vignetta della tavola resta
      page.strips.splice(si, 1);
      const hs = normalize(page.strips.map((x) => x.height));
      page.strips.forEach((x, i) => (x.height = hs[i]));
      return true;
    }
    strip.panels.splice(pi, 1);
    const ws = normalize(strip.panels.map((x) => x.width));
    strip.panels.forEach((x, i) => (x.width = ws[i]));
    return true;
  }
  return false;
}

/** Vignette della tavola in ordine di lettura. */
export function pagePanels(page: Page): Panel[] {
  return page.strips.flatMap((s) => s.panels);
}

export function findPanel(page: Page, panelId: string): { strip: Strip; si: number; pi: number } | null {
  for (let si = 0; si < page.strips.length; si++) {
    const pi = page.strips[si].panels.findIndex((p) => p.id === panelId);
    if (pi >= 0) return { strip: page.strips[si], si, pi };
  }
  return null;
}

/** Scambia il contenuto (testo e campi) di due vignette lasciando invariata la geometria. */
export function swapPanelContent(a: Panel, b: Panel): void {
  const tmp = { id: a.id, fields: a.fields, description: a.description, elements: a.elements };
  a.id = b.id;
  a.fields = b.fields;
  a.description = b.description;
  a.elements = b.elements;
  b.id = tmp.id;
  b.fields = tmp.fields;
  b.description = tmp.description;
  b.elements = tmp.elements;
}

export interface LayoutTemplate {
  key: string;
  name: string;
  rows: { h: number; w: number[] }[];
}

export const TEMPLATES: LayoutTemplate[] = [
  { key: 'splash', name: 'Splash', rows: [{ h: 100, w: [100] }] },
  { key: 'due', name: '2 strisce', rows: [{ h: 50, w: [100] }, { h: 50, w: [100] }] },
  { key: 'tre', name: '3 strisce', rows: [{ h: 33.3, w: [100] }, { h: 33.3, w: [100] }, { h: 33.4, w: [100] }] },
  { key: 'gabbia', name: 'Gabbia 3×2', rows: [{ h: 33.3, w: [50, 50] }, { h: 33.3, w: [50, 50] }, { h: 33.4, w: [50, 50] }] },
  { key: 'nove', name: 'Griglia 9', rows: [{ h: 33.3, w: [33.3, 33.3, 33.4] }, { h: 33.3, w: [33.3, 33.3, 33.4] }, { h: 33.4, w: [33.3, 33.3, 33.4] }] },
  { key: 'apertura', name: 'Apertura', rows: [{ h: 40, w: [100] }, { h: 30, w: [50, 50] }, { h: 30, w: [33.3, 33.3, 33.4] }] },
  { key: 'panoramica', name: 'Panoramica', rows: [{ h: 25, w: [50, 50] }, { h: 50, w: [100] }, { h: 25, w: [33.3, 33.3, 33.4] }] },
  { key: 'quattro', name: '4 strisce', rows: [{ h: 25, w: [50, 50] }, { h: 25, w: [33.3, 33.3, 33.4] }, { h: 25, w: [100] }, { h: 25, w: [50, 50] }] },
];

export function templateSlots(t: LayoutTemplate): number {
  return t.rows.reduce((a, r) => a + r.w.length, 0);
}

/**
 * Applica una griglia alla tavola mantenendo il contenuto delle vignette in ordine di lettura.
 * Se le vignette sono più degli spazi, quelle in eccesso finiscono nell'ultima striscia;
 * se sono meno, vengono create vignette vuote.
 */
export function applyTemplate(page: Page, t: LayoutTemplate): void {
  const existing = pagePanels(page);
  let k = 0;
  const strips: Strip[] = t.rows.map((row) => {
    const panels = row.w.map((w) => {
      const p = existing[k] ?? newPanel();
      k++;
      p.width = w;
      return p;
    });
    return newStrip(row.h, panels);
  });
  if (k < existing.length) {
    const last = strips[strips.length - 1];
    last.panels.push(...existing.slice(k));
    const ws = equal(last.panels.length);
    last.panels.forEach((p, i) => (p.width = ws[i]));
  }
  page.strips = strips;
}
