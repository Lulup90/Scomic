// Modello dati della sceneggiatura.
// Gerarchia: Progetto → Tavola → Striscia → Vignetta → Elementi (balloon, didascalie, SFX…)

export type FieldKey = 'ambiente' | 'luogo' | 'momento' | 'luce' | 'inquadratura';

export const FIELD_KEYS: FieldKey[] = ['ambiente', 'luogo', 'momento', 'luce', 'inquadratura'];

export const FIELD_LABELS: Record<FieldKey, string> = {
  ambiente: 'Ambiente',
  luogo: 'Luogo',
  momento: 'Momento',
  luce: 'Luce',
  inquadratura: 'Inquadratura',
};

/** Campi che, se lasciati vuoti, vengono ripresi dalla vignetta precedente. */
export const INHERITABLE: FieldKey[] = ['ambiente', 'luogo', 'momento', 'luce'];

export type ElementType =
  | 'balloon'
  | 'pensiero'
  | 'sussurro'
  | 'urlo'
  | 'fuoricampo'
  | 'didascalia'
  | 'sfx'
  | 'nota';

export const ELEMENT_TYPES: { type: ElementType; label: string; hasCharacter: boolean }[] = [
  { type: 'balloon', label: 'Balloon', hasCharacter: true },
  { type: 'pensiero', label: 'Pensiero', hasCharacter: true },
  { type: 'sussurro', label: 'Sussurro', hasCharacter: true },
  { type: 'urlo', label: 'Urlo', hasCharacter: true },
  { type: 'fuoricampo', label: 'Fuori campo', hasCharacter: true },
  { type: 'didascalia', label: 'Didascalia', hasCharacter: false },
  { type: 'sfx', label: 'SFX', hasCharacter: false },
  { type: 'nota', label: 'Nota per il disegnatore', hasCharacter: false },
];

export function elementHasCharacter(type: ElementType): boolean {
  return ELEMENT_TYPES.find((t) => t.type === type)?.hasCharacter ?? false;
}

export interface ScriptElement {
  id: string;
  type: ElementType;
  /** Nome del personaggio (solo per balloon, pensieri, ecc.). */
  character: string;
  text: string;
}

export interface Panel {
  id: string;
  /** Larghezza in percentuale rispetto alla striscia. */
  width: number;
  /** Valori scritti in questa vignetta. Un campo assente o vuoto viene ereditato. */
  fields: Partial<Record<FieldKey, string>>;
  description: string;
  elements: ScriptElement[];
}

export interface Strip {
  id: string;
  /** Altezza in percentuale rispetto all'area disegnabile della tavola. */
  height: number;
  panels: Panel[];
}

export interface Page {
  id: string;
  notes: string;
  strips: Strip[];
}

export interface Character {
  id: string;
  name: string;
  notes: string;
}

export interface Place {
  id: string;
  name: string;
}

export type FormatKey = 'bonelli' | 'francese' | 'a4' | 'us' | 'manga' | 'custom';

export interface Project {
  version: 1;
  title: string;
  subtitle: string;
  author: string;
  /** La storia in una o due frasi. */
  logline: string;
  /** Il soggetto: la trama per esteso. */
  soggetto: string;
  format: FormatKey;
  /** Usato solo con format = 'custom' (centimetri). */
  customSize: { w: number; h: number };
  /** Soglia oltre cui una vignetta ha "troppo testo": parole per ogni 1% di tavola. */
  densityThreshold: number;
  characters: Character[];
  places: Place[];
  pages: Page[];
}
