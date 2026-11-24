import { create } from 'zustand';
import { produce, type Draft } from 'immer';
import { parseProject, sampleProject } from '../model/factory';
import type { Project } from '../model/types';

export type View = 'scrivi' | 'menabo' | 'stampa';

const STORAGE_KEY = 'scomic.progetto.v1';
/** Chiave usata dalle prime versioni (quando l'app si chiamava Tavole). */
const OLD_STORAGE_KEY = 'tavole.progetto.v1';
const HISTORY_LIMIT = 200;
const COALESCE_MS = 1200;

interface State {
  project: Project;
  pageId: string;
  panelId: string | null;
  view: View;
  past: Project[];
  future: Project[];
  lastKey: string | null;
  lastTime: number;
  /** Id dell'elemento che deve ricevere il focus al prossimo render. */
  focusId: string | null;
  savedAt: number | null;

  /**
   * Modifica il progetto. Le modifiche con la stessa `key` ravvicinate nel tempo
   * (es. digitazione nello stesso campo) diventano un solo passo di annullamento.
   */
  update: (recipe: (draft: Draft<Project>) => void, key?: string) => void;
  undo: () => void;
  redo: () => void;
  setView: (view: View) => void;
  selectPage: (pageId: string) => void;
  selectPanel: (panelId: string | null, pageId?: string) => void;
  requestFocus: (id: string | null) => void;
  loadProject: (project: Project) => void;
}

function loadInitial(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(OLD_STORAGE_KEY);
    if (raw) return parseProject(JSON.parse(raw));
  } catch {
    // archivio del browser non disponibile o dati non validi: si riparte dall'esempio
  }
  return sampleProject();
}

const initial = loadInitial();

export const useStore = create<State>((set, get) => ({
  project: initial,
  pageId: initial.pages[0].id,
  panelId: initial.pages[0].strips[0]?.panels[0]?.id ?? null,
  view: 'scrivi',
  past: [],
  future: [],
  lastKey: null,
  lastTime: 0,
  focusId: null,
  savedAt: null,

  update: (recipe, key) => {
    const s = get();
    const next = produce(s.project, recipe);
    if (next === s.project) return;
    const now = Date.now();
    const coalesce = key !== undefined && key === s.lastKey && now - s.lastTime < COALESCE_MS;
    set({
      project: next,
      past: coalesce ? s.past : [...s.past.slice(-HISTORY_LIMIT + 1), s.project],
      future: [],
      lastKey: key ?? null,
      lastTime: now,
    });
    fixSelection();
  },

  undo: () => {
    const s = get();
    if (!s.past.length) return;
    const prev = s.past[s.past.length - 1];
    set({ project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future], lastKey: null });
    fixSelection();
  },

  redo: () => {
    const s = get();
    if (!s.future.length) return;
    const [next, ...rest] = s.future;
    set({ project: next, future: rest, past: [...s.past, s.project], lastKey: null });
    fixSelection();
  },

  setView: (view) => set({ view }),
  selectPage: (pageId) => {
    const page = get().project.pages.find((p) => p.id === pageId);
    set({ pageId, panelId: page?.strips[0]?.panels[0]?.id ?? null });
  },
  selectPanel: (panelId, pageId) => set(pageId ? { panelId, pageId } : { panelId }),
  requestFocus: (focusId) => set({ focusId }),
  loadProject: (project) =>
    set({
      project,
      pageId: project.pages[0].id,
      panelId: project.pages[0].strips[0]?.panels[0]?.id ?? null,
      past: [],
      future: [],
      lastKey: null,
      view: 'scrivi',
    }),
}));

/** Dopo una modifica, la tavola o la vignetta selezionata potrebbero non esistere più. */
function fixSelection() {
  const { project, pageId, panelId } = useStore.getState();
  let page = project.pages.find((p) => p.id === pageId);
  const patch: Partial<State> = {};
  if (!page) {
    page = project.pages[0];
    patch.pageId = page.id;
  }
  const panels = page.strips.flatMap((s) => s.panels);
  if (!panelId || !panels.some((p) => p.id === panelId)) {
    // La vignetta selezionata può essere stata spostata in un'altra tavola
    const owner = project.pages.find((p) => p.strips.some((s) => s.panels.some((x) => x.id === panelId)));
    if (owner && panelId) patch.pageId = owner.id;
    else patch.panelId = panels[0]?.id ?? null;
  }
  if (Object.keys(patch).length) useStore.setState(patch);
}

// Salvataggio automatico nel browser
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let dirty = false;

/** Scrive subito il progetto nel browser (senza aspettare la pausa nella digitazione). */
export function flushSave() {
  clearTimeout(saveTimer);
  if (!dirty) return;
  dirty = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(useStore.getState().project));
    useStore.setState({ savedAt: Date.now() });
  } catch {
    // archivio pieno o non disponibile: il progetto resta in memoria, si può salvare su file
  }
}

useStore.subscribe((state, prev) => {
  if (state.project === prev.project) return;
  dirty = true;
  clearTimeout(saveTimer);
  // Un progetto appena aperto o importato si salva subito, le modifiche dopo una breve pausa
  if (state.past.length === 0 && state.future.length === 0) flushSave();
  else saveTimer = setTimeout(flushSave, 400);
});

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSave();
  });
}
