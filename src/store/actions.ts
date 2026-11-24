// Azioni sul progetto. Ognuna passa da `update`, quindi è annullabile.
import type { Draft } from 'immer';
import { uid } from '../model/id';
import {
  addPanelToStrip,
  addStripToPage,
  applyTemplate,
  findPanel,
  newPage,
  pagePanels,
  removePanel,
  resizePair,
  swapPanelContent,
  type LayoutTemplate,
} from '../model/layout';
import type { ElementType, FieldKey, FormatKey, Page, Panel, Project, ScriptElement } from '../model/types';
import { useStore } from './store';

const update = (recipe: (d: Draft<Project>) => void, key?: string) => useStore.getState().update(recipe, key);

function findPanelDraft(project: Draft<Project>, panelId: string): Draft<Panel> | null {
  for (const page of project.pages)
    for (const strip of page.strips)
      for (const panel of strip.panels) if (panel.id === panelId) return panel;
  return null;
}

function findPageDraft(project: Draft<Project>, pageId: string): Draft<Page> | undefined {
  return project.pages.find((p) => p.id === pageId);
}

// --- Progetto -------------------------------------------------------------

export function setMeta(field: 'title' | 'subtitle' | 'author', value: string) {
  update((d) => {
    d[field] = value;
  }, `meta:${field}`);
}

export function setFormat(format: FormatKey) {
  update((d) => {
    d.format = format;
  });
}

export function setCustomSize(w: number, h: number) {
  update((d) => {
    d.customSize = { w, h };
  }, 'customSize');
}

export function setThreshold(v: number) {
  update((d) => {
    d.densityThreshold = v;
  }, 'threshold');
}

// --- Tavole ---------------------------------------------------------------

export function addPage(afterPageId?: string) {
  const page = newPage();
  update((d) => {
    const idx = afterPageId ? d.pages.findIndex((p) => p.id === afterPageId) : d.pages.length - 1;
    d.pages.splice(idx + 1, 0, page);
  });
  useStore.getState().selectPage(page.id);
  useStore.getState().requestFocus(`desc:${page.strips[0].panels[0].id}`);
}

export function duplicatePage(pageId: string) {
  const src = useStore.getState().project.pages.find((p) => p.id === pageId);
  if (!src) return;
  const copy: Page = JSON.parse(JSON.stringify(src));
  copy.id = uid('t');
  copy.strips.forEach((s) => {
    s.id = uid('s');
    s.panels.forEach((p) => {
      p.id = uid('v');
      p.elements.forEach((e) => (e.id = uid('e')));
    });
  });
  update((d) => {
    const idx = d.pages.findIndex((p) => p.id === pageId);
    d.pages.splice(idx + 1, 0, copy);
  });
  useStore.getState().selectPage(copy.id);
}

export function deletePage(pageId: string) {
  update((d) => {
    if (d.pages.length <= 1) return;
    const idx = d.pages.findIndex((p) => p.id === pageId);
    if (idx >= 0) d.pages.splice(idx, 1);
  });
}

export function movePage(pageId: string, dir: -1 | 1) {
  update((d) => {
    const i = d.pages.findIndex((p) => p.id === pageId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= d.pages.length) return;
    const [p] = d.pages.splice(i, 1);
    d.pages.splice(j, 0, p);
  });
}

export function setPageNotes(pageId: string, notes: string) {
  update((d) => {
    const page = findPageDraft(d, pageId);
    if (page) page.notes = notes;
  }, `notes:${pageId}`);
}

export function applyPageTemplate(pageId: string, t: LayoutTemplate) {
  update((d) => {
    const page = findPageDraft(d, pageId);
    if (page) applyTemplate(page as Page, t);
  });
}

// --- Strisce e vignette ---------------------------------------------------

/** Nuova vignetta nella stessa striscia di `afterPanelId` (o nell'ultima striscia). */
export function addPanel(pageId: string, afterPanelId?: string | null) {
  let newId = '';
  update((d) => {
    const page = findPageDraft(d, pageId) as Page | undefined;
    if (!page) return;
    const loc = afterPanelId ? findPanel(page, afterPanelId) : null;
    if (loc) newId = addPanelToStrip(loc.strip, loc.pi).id;
    else newId = addPanelToStrip(page.strips[page.strips.length - 1]).id;
  });
  if (newId) {
    useStore.getState().selectPanel(newId);
    useStore.getState().requestFocus(`desc:${newId}`);
  }
}

/** Nuova striscia (con una vignetta) dopo quella della vignetta indicata, o in fondo. */
export function addStrip(pageId: string, afterPanelId?: string | null) {
  let newId = '';
  update((d) => {
    const page = findPageDraft(d, pageId) as Page | undefined;
    if (!page) return;
    const loc = afterPanelId ? findPanel(page, afterPanelId) : null;
    newId = addStripToPage(page, loc ? loc.si : undefined).panels[0].id;
  });
  if (newId) {
    useStore.getState().selectPanel(newId);
    useStore.getState().requestFocus(`desc:${newId}`);
  }
}

export function deletePanel(pageId: string, panelId: string) {
  update((d) => {
    const page = findPageDraft(d, pageId) as Page | undefined;
    if (page) removePanel(page, panelId);
  });
}

/** Sposta il contenuto della vignetta prima/dopo nell'ordine di lettura (le dimensioni restano). */
export function movePanel(pageId: string, panelId: string, dir: -1 | 1) {
  update((d) => {
    const page = findPageDraft(d, pageId) as Page | undefined;
    if (!page) return;
    const list = pagePanels(page);
    const i = list.findIndex((p) => p.id === panelId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    swapPanelContent(list[i], list[j]);
  });
}

export function resizePanel(pageId: string, si: number, pi: number, value: number, neighbor?: number) {
  update((d) => {
    const strip = findPageDraft(d, pageId)?.strips[si];
    if (!strip) return;
    const ws = resizePair(
      strip.panels.map((p) => p.width),
      pi,
      value,
      neighbor,
    );
    strip.panels.forEach((p, i) => (p.width = ws[i]));
  }, `resize:${pageId}:${si}:${pi}`);
}

export function resizeStrip(pageId: string, si: number, value: number, neighbor?: number) {
  update((d) => {
    const page = findPageDraft(d, pageId);
    if (!page) return;
    const hs = resizePair(
      page.strips.map((s) => s.height),
      si,
      value,
      neighbor,
    );
    page.strips.forEach((s, i) => (s.height = hs[i]));
  }, `resizeStrip:${pageId}:${si}`);
}

export function setField(panelId: string, key: FieldKey, value: string) {
  update((d) => {
    const p = findPanelDraft(d, panelId);
    if (!p) return;
    if (value === '') delete p.fields[key];
    else p.fields[key] = value;
  }, `field:${panelId}:${key}`);
}

export function setDescription(panelId: string, value: string) {
  update((d) => {
    const p = findPanelDraft(d, panelId);
    if (p) p.description = value;
  }, `desc:${panelId}`);
}

// --- Elementi (balloon, didascalie, SFX, note) ----------------------------

export function addElement(panelId: string, type: ElementType, afterElementId?: string, character = '') {
  const el: ScriptElement = { id: uid('e'), type, character, text: '' };
  update((d) => {
    const p = findPanelDraft(d, panelId);
    if (!p) return;
    const idx = afterElementId ? p.elements.findIndex((e) => e.id === afterElementId) : -1;
    if (idx >= 0) p.elements.splice(idx + 1, 0, el);
    else p.elements.push(el);
  });
  const hasChar = ['balloon', 'pensiero', 'sussurro', 'urlo', 'fuoricampo'].includes(type);
  useStore.getState().requestFocus(hasChar && !character ? `char:${el.id}` : `text:${el.id}`);
  return el.id;
}

export function updateElement(panelId: string, elementId: string, patch: Partial<Omit<ScriptElement, 'id'>>) {
  const key = `el:${elementId}:${Object.keys(patch).join(',')}`;
  update((d) => {
    const p = findPanelDraft(d, panelId);
    const e = p?.elements.find((x) => x.id === elementId);
    if (e) Object.assign(e, patch);
  }, key);
}

export function deleteElement(panelId: string, elementId: string) {
  update((d) => {
    const p = findPanelDraft(d, panelId);
    if (!p) return;
    const i = p.elements.findIndex((x) => x.id === elementId);
    if (i >= 0) p.elements.splice(i, 1);
  });
}

export function moveElement(panelId: string, elementId: string, dir: -1 | 1) {
  update((d) => {
    const p = findPanelDraft(d, panelId);
    if (!p) return;
    const i = p.elements.findIndex((x) => x.id === elementId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= p.elements.length) return;
    const [e] = p.elements.splice(i, 1);
    p.elements.splice(j, 0, e);
  });
}

// --- Archivio: personaggi e luoghi ----------------------------------------

/** Aggiunge il personaggio all'archivio se non c'è già (confronto senza maiuscole). */
export function ensureCharacter(name: string) {
  const n = name.trim();
  if (!n) return;
  const exists = useStore.getState().project.characters.some((c) => c.name.toLowerCase() === n.toLowerCase());
  if (exists) return;
  update((d) => {
    d.characters.push({ id: uid('c'), name: n, notes: '' });
  });
}

export function ensurePlace(name: string) {
  const n = name.trim();
  if (!n) return;
  const exists = useStore.getState().project.places.some((c) => c.name.toLowerCase() === n.toLowerCase());
  if (exists) return;
  update((d) => {
    d.places.push({ id: uid('l'), name: n });
  });
}

/** Rinomina un personaggio in tutta la sceneggiatura. */
export function renameCharacter(id: string, newName: string) {
  const n = newName.trim();
  if (!n) return;
  update((d) => {
    const c = d.characters.find((x) => x.id === id);
    if (!c) return;
    const old = c.name.toLowerCase();
    c.name = n;
    for (const page of d.pages)
      for (const strip of page.strips)
        for (const panel of strip.panels)
          for (const e of panel.elements) if (e.character.trim().toLowerCase() === old) e.character = n;
  });
}

export function setCharacterNotes(id: string, notes: string) {
  update((d) => {
    const c = d.characters.find((x) => x.id === id);
    if (c) c.notes = notes;
  }, `charnotes:${id}`);
}

export function deleteCharacter(id: string) {
  update((d) => {
    d.characters = d.characters.filter((c) => c.id !== id);
  });
}

/** Rinomina un luogo in tutte le vignette dove è scritto. */
export function renamePlace(id: string, newName: string) {
  const n = newName.trim();
  if (!n) return;
  update((d) => {
    const pl = d.places.find((x) => x.id === id);
    if (!pl) return;
    const old = pl.name.toLowerCase();
    pl.name = n;
    for (const page of d.pages)
      for (const strip of page.strips)
        for (const panel of strip.panels)
          if ((panel.fields.luogo ?? '').trim().toLowerCase() === old) panel.fields.luogo = n;
  });
}

export function deletePlace(id: string) {
  update((d) => {
    d.places = d.places.filter((c) => c.id !== id);
  });
}
