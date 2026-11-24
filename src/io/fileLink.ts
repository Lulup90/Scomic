// Collegamento del progetto a un file sul computer: dopo il primo "Salva", ogni modifica
// viene scritta da sola nello stesso file (Chrome, Edge e altri browser che lo permettono).
// Dove non è possibile si ripiega sullo scaricamento del file.
import { create } from 'zustand';
import { parseProject } from '../model/factory';
import type { Project } from '../model/types';
import { useStore } from '../store/store';
import { askConfirm, notify } from '../store/ui';
import { fileSafeName } from './exporters';
import { openProjectFile } from './files';
import { IS_ARTIFACT, saveFile } from './platform';

// Tipi minimi della File System Access API (non ancora in lib.dom di TypeScript)
interface WritableStream {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface FileHandle {
  name: string;
  getFile(): Promise<File>;
  createWritable(): Promise<WritableStream>;
  queryPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission?(o: { mode: 'readwrite' }): Promise<PermissionState>;
}
type PickerTypes = { description: string; accept: Record<string, string[]> }[];
interface FsWindow {
  showSaveFilePicker?: (o: { suggestedName?: string; types?: PickerTypes }) => Promise<FileHandle>;
  showOpenFilePicker?: (o: { types?: PickerTypes; multiple?: boolean }) => Promise<FileHandle[]>;
}

const TYPES: PickerTypes = [{ description: 'Progetto Scomic', accept: { 'application/json': ['.json'] } }];

function fsWindow(): FsWindow {
  return window as unknown as FsWindow;
}

/** Il browser permette di scrivere direttamente in un file scelto dall'utente. */
export function canLinkFiles(): boolean {
  if (IS_ARTIFACT || typeof window === 'undefined') return false;
  let topLevel = true;
  try {
    topLevel = window.self === window.top;
  } catch {
    topLevel = false;
  }
  return topLevel && typeof fsWindow().showSaveFilePicker === 'function';
}

export type LinkStatus = 'none' | 'linked' | 'saving' | 'needs-permission' | 'error';

interface LinkState {
  handle: FileHandle | null;
  name: string | null;
  status: LinkStatus;
  /** Ultimo salvataggio su file (collegato o scaricato). */
  savedAt: number | null;
  /** Modifiche fatte dopo l'ultimo salvataggio su file. */
  pending: number;
  reminded: boolean;
}

export const useFileLink = create<LinkState>(() => ({
  handle: null,
  name: null,
  status: 'none',
  savedAt: null,
  pending: 0,
  reminded: false,
}));

// --- Memoria del collegamento tra una sessione e l'altra (IndexedDB) -------

const DB = 'scomic';
const STORE = 'kv';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown) {
  try {
    const db = await idb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      if (value === undefined) tx.objectStore(STORE).delete(key);
      else tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // archivio non disponibile: il collegamento vale solo per questa sessione
  }
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await idb();
    return await new Promise<T | undefined>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

// --- Scrittura -----------------------------------------------------------

function serialize(project: Project): string {
  return JSON.stringify(project, null, 2);
}

async function writeTo(handle: FileHandle, project: Project): Promise<boolean> {
  useFileLink.setState({ status: 'saving' });
  try {
    const w = await handle.createWritable();
    await w.write(serialize(project));
    await w.close();
    useFileLink.setState({ status: 'linked', savedAt: Date.now(), pending: 0, reminded: false });
    return true;
  } catch (e) {
    const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    useFileLink.setState({ status: denied ? 'needs-permission' : 'error' });
    return false;
  }
}

function setLinked(handle: FileHandle) {
  useFileLink.setState({ handle, name: handle.name, status: 'linked' });
  void idbSet('fileHandle', handle);
}

/** Sceglie un nuovo file e ci salva il progetto ("Salva con nome"). */
export async function saveAs(): Promise<void> {
  const project = useStore.getState().project;
  const name = `${fileSafeName(project.title)}.scomic.json`;
  if (!canLinkFiles()) {
    const r = await saveFile(name, serialize(project), 'application/json');
    if (r === 'saved') useFileLink.setState({ savedAt: Date.now(), pending: 0, reminded: false });
    else if (r === 'unavailable') notify('Qui non è possibile salvare file. Il progetto resta salvato in questo browser.');
    return;
  }
  try {
    const handle = await fsWindow().showSaveFilePicker!({ suggestedName: name, types: TYPES });
    if (await writeTo(handle, project)) {
      setLinked(handle);
      notify(`Collegato a ${handle.name}: da ora le modifiche si salvano da sole in questo file.`);
    }
  } catch (e) {
    if (!(e instanceof DOMException && e.name === 'AbortError')) notify('Non è stato possibile salvare il file.');
  }
}

/** "Salva": nel file collegato se c'è, altrimenti come "Salva con nome". */
export async function save(): Promise<void> {
  const { handle, status } = useFileLink.getState();
  if (handle && status !== 'needs-permission') {
    if (await writeTo(handle, useStore.getState().project)) notify(`Salvato in ${handle.name}.`);
    return;
  }
  if (handle && status === 'needs-permission') {
    await reconnect();
    return;
  }
  await saveAs();
}

/** Apre un progetto da file; dove possibile lo collega per i salvataggi successivi. */
export async function openFile(): Promise<void> {
  if (!canLinkFiles()) {
    try {
      const p = await openProjectFile();
      useStore.getState().loadProject(p);
      unlink();
      notify(`Aperto "${p.title}".`);
    } catch (e) {
      if (e instanceof Error && e.message !== 'Nessun file scelto.') notify(e.message);
    }
    return;
  }
  try {
    const [handle] = await fsWindow().showOpenFilePicker!({ types: TYPES, multiple: false });
    const project = parseProject(JSON.parse(await (await handle.getFile()).text()));
    useStore.getState().loadProject(project);
    setLinked(handle);
    useFileLink.setState({ savedAt: Date.now(), pending: 0, reminded: false });
    notify(`Aperto ${handle.name}. Le modifiche verranno salvate in questo file.`);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return;
    notify(e instanceof Error ? e.message : 'Il file non è leggibile.');
  }
}

/** Dopo aver riaperto l'app il browser chiede di nuovo il permesso di scrivere nel file. */
export async function reconnect(): Promise<void> {
  const { handle } = useFileLink.getState();
  if (!handle) return;
  try {
    const perm = (await handle.requestPermission?.({ mode: 'readwrite' })) ?? 'granted';
    if (perm !== 'granted') {
      useFileLink.setState({ status: 'needs-permission' });
      return;
    }
    const onDisk = await (await handle.getFile()).text();
    const current = useStore.getState().project;
    if (onDisk.trim() && onDisk !== serialize(current)) {
      let fileProject: Project | null = null;
      try {
        fileProject = parseProject(JSON.parse(onDisk));
      } catch {
        fileProject = null;
      }
      if (
        fileProject &&
        (await askConfirm(
          `Il file ${handle.name} contiene una versione diversa da quella aperta qui. Vuoi aprire la versione del file? Se scegli Annulla, il file verrà aggiornato con la versione aperta qui.`,
          'Apri la versione del file',
        ))
      ) {
        useStore.getState().loadProject(fileProject);
        useFileLink.setState({ status: 'linked', savedAt: Date.now(), pending: 0 });
        return;
      }
    }
    await writeTo(handle, useStore.getState().project);
  } catch {
    useFileLink.setState({ status: 'error' });
  }
}

/** Scollega il file (es. dopo "Nuovo progetto"), così non viene sovrascritto per errore. */
export function unlink(): void {
  useFileLink.setState({ handle: null, name: null, status: 'none', savedAt: null, pending: 0, reminded: false });
  void idbSet('fileHandle', undefined);
}

/** All'avvio: ritrova il file collegato nella sessione precedente e comincia a seguire le modifiche. */
export async function initFileLink(): Promise<void> {
  if (canLinkFiles()) {
    const handle = await idbGet<FileHandle>('fileHandle');
    if (handle) {
      const perm = (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'prompt';
      useFileLink.setState({ handle, name: handle.name, status: perm === 'granted' ? 'linked' : 'needs-permission' });
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  useStore.subscribe((state, prev) => {
    if (state.project === prev.project) return;
    const link = useFileLink.getState();
    const pending = link.pending + 1;
    useFileLink.setState({ pending });
    if (link.handle && (link.status === 'linked' || link.status === 'saving' || link.status === 'error')) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const l = useFileLink.getState();
        if (l.handle && l.status !== 'needs-permission') void writeTo(l.handle, useStore.getState().project);
      }, 1500);
    } else if (pending >= 40 && !link.reminded) {
      useFileLink.setState({ reminded: true });
      notify('Ricordati di salvare su file (menu File): per ora il lavoro è salvato solo in questo browser.');
    }
  });
}
