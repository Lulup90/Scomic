import { describe, expect, it } from 'vitest';
import { produce } from 'immer';
import { emptyProject, parseProject, sampleProject } from './factory';
import {
  addPanelToStrip,
  addStripToPage,
  applyTemplate,
  normalize,
  pagePanels,
  removePanel,
  resizePair,
  swapPanelContent,
  TEMPLATES,
} from './layout';
import { countWords, resolveProject, usedValues } from './resolve';
import type { Page } from './types';

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 10) / 10;

describe('geometria della tavola', () => {
  it('resizePair mantiene costante la somma dei due vicini', () => {
    expect(resizePair([40, 60], 0, 70)).toEqual([70, 30]);
    expect(resizePair([30, 30, 40], 2, 50)).toEqual([30, 20, 50]); // l'ultimo prende dal precedente
  });

  it('resizePair rispetta la dimensione minima', () => {
    expect(resizePair([50, 50], 0, 99)).toEqual([92, 8]);
    expect(resizePair([50, 50], 0, 1)).toEqual([8, 92]);
  });

  it('normalize riporta la somma a 100', () => {
    expect(sum(normalize([1, 1, 1]))).toBe(100);
    expect(sum(normalize([20, 20]))).toBe(100);
  });

  it('aggiungere vignette e strisce mantiene le somme a 100', () => {
    const page = emptyProject().pages[0];
    addPanelToStrip(page.strips[0]);
    addPanelToStrip(page.strips[0]);
    expect(sum(page.strips[0].panels.map((p) => p.width))).toBe(100);
    addStripToPage(page);
    addStripToPage(page);
    expect(page.strips).toHaveLength(3);
    expect(sum(page.strips.map((s) => s.height))).toBe(100);
  });

  it('rimuovere l’unica vignetta di una striscia elimina la striscia', () => {
    const page = emptyProject().pages[0];
    const s2 = addStripToPage(page);
    expect(removePanel(page, s2.panels[0].id)).toBe(true);
    expect(page.strips).toHaveLength(1);
    expect(page.strips[0].height).toBe(100);
    // l'ultima vignetta della tavola non si può togliere
    expect(removePanel(page, page.strips[0].panels[0].id)).toBe(false);
  });

  it('applicare una griglia conserva il contenuto in ordine di lettura', () => {
    const project = sampleProject();
    const page = project.pages[1];
    const before = pagePanels(page).map((p) => p.description);
    applyTemplate(page, TEMPLATES.find((t) => t.key === 'gabbia')!);
    expect(page.strips).toHaveLength(3);
    expect(pagePanels(page).map((p) => p.description)).toEqual(before);
  });

  it('una griglia con meno spazi mette le vignette in più nell’ultima striscia', () => {
    const page = sampleProject().pages[1]; // 6 vignette
    applyTemplate(page, TEMPLATES.find((t) => t.key === 'due')!);
    expect(page.strips).toHaveLength(2);
    expect(page.strips[1].panels).toHaveLength(5);
    expect(sum(page.strips[1].panels.map((p) => p.width))).toBe(100);
  });

  it('swapPanelContent funziona anche dentro immer', () => {
    const page = sampleProject().pages[1];
    const [a, b] = pagePanels(page);
    const next = produce(page, (d: Page) => {
      const list = pagePanels(d);
      swapPanelContent(list[0], list[1]);
    });
    const [na, nb] = pagePanels(next);
    expect(na.description).toBe(b.description);
    expect(nb.description).toBe(a.description);
    expect(na.width).toBe(a.width); // la geometria resta
  });
});

describe('ereditarietà e calcoli', () => {
  it('i campi vuoti vengono ripresi dalla vignetta precedente, anche tra tavole', () => {
    const r = resolveProject(sampleProject());
    const v21 = r.pages[1].panels[0];
    expect(v21.number).toBe('2.1');
    expect(v21.fields.luogo).toEqual({ value: 'Porto, molo 7', inherited: true, from: '1.1' });
    expect(v21.fields.inquadratura.inherited).toBe(false);
    // la 2.3 cambia la luce: dalla 2.4 in poi la luce nuova è ereditata
    const v24 = r.pages[1].panels[3];
    expect(v24.fields.luce).toEqual({ value: 'Fascio del faro, intermittente', inherited: true, from: '2.3' });
  });

  it('l’inquadratura non viene ereditata', () => {
    const r = resolveProject(sampleProject());
    const v31 = r.pages[2].panels[0];
    expect(v31.fields.ambiente.value).toBe('INT');
    const v32 = r.pages[2].panels[1];
    expect(v32.fields.ambiente).toMatchObject({ value: 'INT', inherited: true });
  });

  it('area e densità del testo', () => {
    const project = sampleProject();
    const r = resolveProject(project);
    const v25 = r.pages[1].panels[4]; // 30% × 32%
    expect(v25.area).toBeCloseTo(9.6);
    expect(v25.words).toBe(25);
    expect(v25.dense).toBe(true);
    const v23 = r.pages[1].panels[2];
    expect(v23.dense).toBe(false);
    // SFX e note non contano come parole
    expect(r.pages[1].panels[3].words).toBe(0);
  });

  it('conteggio parole', () => {
    expect(countWords('  Dov’è finita?  Aveva detto mezzanotte. ')).toBe(5);
    expect(countWords('')).toBe(0);
  });

  it('usedValues ordina per frequenza', () => {
    const project = sampleProject();
    expect(usedValues(project, 'luogo')).toEqual(['Porto, molo 7', 'Bar Ancora']);
  });

  it('parseProject rifiuta file non validi', () => {
    expect(() => parseProject({ foo: 1 })).toThrow();
    const p = parseProject(JSON.parse(JSON.stringify(sampleProject())));
    expect(p.pages).toHaveLength(3);
  });
});
