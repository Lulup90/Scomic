// Calcoli derivati: numerazione, ereditarietà dei campi, aree e densità del testo.
import { FIELD_KEYS, INHERITABLE, type FieldKey, type Panel, type Project, type ScriptElement } from './types';

export interface ResolvedField {
  value: string;
  inherited: boolean;
  /** Numero della vignetta da cui il valore è ripreso (es. "3.1"). */
  from?: string;
}

export interface ResolvedPanel {
  panel: Panel;
  pageId: string;
  pageNumber: number;
  stripIndex: number;
  /** Numero progressivo della vignetta nella tavola (da 1). */
  index: number;
  /** Etichetta "tavola.vignetta", es. "3.2". */
  number: string;
  fields: Record<FieldKey, ResolvedField>;
  words: number;
  /** Percentuale della tavola occupata. */
  area: number;
  /** Larghezza % nella striscia e altezza % della striscia (normalizzate). */
  width: number;
  height: number;
  /** Parole per ogni 1% di tavola. */
  density: number;
  dense: boolean;
}

export interface ResolvedPage {
  pageId: string;
  number: number;
  panels: ResolvedPanel[];
  words: number;
  denseCount: number;
}

export interface Resolved {
  pages: ResolvedPage[];
  byPanel: Record<string, ResolvedPanel>;
  byPage: Record<string, ResolvedPage>;
  totalPanels: number;
  totalWords: number;
}

const WORD_TYPES = new Set(['balloon', 'pensiero', 'sussurro', 'urlo', 'fuoricampo', 'didascalia']);

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Parole che finiranno nei balloon e nelle didascalie (SFX e note escluse). */
export function panelWords(elements: ScriptElement[]): number {
  return elements.reduce((s, e) => (WORD_TYPES.has(e.type) ? s + countWords(e.text) : s), 0);
}

export function resolveProject(project: Project): Resolved {
  const last: Partial<Record<FieldKey, { value: string; from: string }>> = {};
  const pages: ResolvedPage[] = [];
  const byPanel: Record<string, ResolvedPanel> = {};
  const byPage: Record<string, ResolvedPage> = {};
  let totalPanels = 0;
  let totalWords = 0;

  project.pages.forEach((page, pageIdx) => {
    const pageNumber = pageIdx + 1;
    const hSum = page.strips.reduce((a, s) => a + s.height, 0) || 1;
    const rp: ResolvedPage = { pageId: page.id, number: pageNumber, panels: [], words: 0, denseCount: 0 };
    let index = 0;
    page.strips.forEach((strip, stripIndex) => {
      const wSum = strip.panels.reduce((a, p) => a + p.width, 0) || 1;
      const height = (strip.height / hSum) * 100;
      strip.panels.forEach((panel) => {
        index++;
        const number = `${pageNumber}.${index}`;
        const fields = {} as Record<FieldKey, ResolvedField>;
        for (const key of FIELD_KEYS) {
          const own = (panel.fields[key] ?? '').trim();
          if (own) {
            fields[key] = { value: own, inherited: false };
            if (INHERITABLE.includes(key)) last[key] = { value: own, from: number };
          } else if (INHERITABLE.includes(key) && last[key]) {
            fields[key] = { value: last[key]!.value, inherited: true, from: last[key]!.from };
          } else {
            fields[key] = { value: '', inherited: false };
          }
        }
        const width = (panel.width / wSum) * 100;
        const area = (width * height) / 100;
        const words = panelWords(panel.elements);
        const density = area > 0 ? words / area : 0;
        const r: ResolvedPanel = {
          panel,
          pageId: page.id,
          pageNumber,
          stripIndex,
          index,
          number,
          fields,
          words,
          area,
          width,
          height,
          density,
          dense: words > 0 && density > project.densityThreshold,
        };
        rp.panels.push(r);
        rp.words += words;
        if (r.dense) rp.denseCount++;
        byPanel[panel.id] = r;
        totalPanels++;
        totalWords += words;
      });
    });
    pages.push(rp);
    byPage[page.id] = rp;
  });

  return { pages, byPanel, byPage, totalPanels, totalWords };
}

/** Tutti i valori già usati per un campo, dal più frequente: servono per i suggerimenti. */
export function usedValues(project: Project, key: FieldKey): string[] {
  const counts = new Map<string, number>();
  for (const page of project.pages)
    for (const strip of page.strips)
      for (const panel of strip.panels) {
        const v = (panel.fields[key] ?? '').trim();
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}

/** Numero di battute (balloon e simili) per personaggio. */
export function characterLines(project: Project): Record<string, number> {
  const out: Record<string, number> = {};
  for (const page of project.pages)
    for (const strip of page.strips)
      for (const panel of strip.panels)
        for (const el of panel.elements) {
          const name = el.character.trim();
          if (name) out[name.toLowerCase()] = (out[name.toLowerCase()] ?? 0) + 1;
        }
  return out;
}

/** Numero di vignette ambientate in ogni luogo (scritto esplicitamente). */
export function placeUses(project: Project): Record<string, number> {
  const out: Record<string, number> = {};
  for (const page of project.pages)
    for (const strip of page.strips)
      for (const panel of strip.panels) {
        const v = (panel.fields.luogo ?? '').trim().toLowerCase();
        if (v) out[v] = (out[v] ?? 0) + 1;
      }
  return out;
}
