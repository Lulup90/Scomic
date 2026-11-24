// Differenze tra l'app normale (browser o file locale) e la versione pubblicata come pagina claude.ai,
// dove il browser non permette né la stampa né lo scaricamento diretto dei file.
import { download } from './files';

export const IS_ARTIFACT = import.meta.env.MODE === 'artifact';

/** La stampa del browser (e quindi "Salva come PDF") è disponibile. */
export const CAN_PRINT = !IS_ARTIFACT;

/** Estensione del file per Word: .doc nell'app, .html dove .doc non è ammesso. */
export const WORD_EXT = IS_ARTIFACT ? 'html' : 'doc';

interface DownloadsApi {
  save(req: { filename: string; data: string }): Promise<unknown>;
}
interface ClaudeHost {
  use(name: string): Promise<DownloadsApi | null>;
}

let downloadsPromise: Promise<DownloadsApi | null> | null = null;

function getDownloads(): Promise<DownloadsApi | null> {
  if (!IS_ARTIFACT) return Promise.resolve(null);
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  if (!host?.use) return Promise.resolve(null);
  downloadsPromise ??= host.use('downloads').catch(() => null);
  return downloadsPromise;
}

export type SaveOutcome = 'saved' | 'declined' | 'unavailable';

/** Salva un file sul computer dell'utente. */
export async function saveFile(filename: string, content: string, mime: string): Promise<SaveOutcome> {
  if (!IS_ARTIFACT) {
    download(filename, content, mime);
    return 'saved';
  }
  const api = await getDownloads();
  if (!api) return 'unavailable';
  try {
    await api.save({ filename, data: content });
    return 'saved';
  } catch (e) {
    const code = (e as { code?: string })?.code;
    return code === 'declined' ? 'declined' : 'unavailable';
  }
}
