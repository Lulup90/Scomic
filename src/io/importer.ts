// Importazione di sceneggiature scritte altrove (Word, testo semplice, esportazioni di Scomic).
//
// Il riconoscimento è volutamente tollerante: accetta i modi più comuni di scrivere una
// sceneggiatura a fumetti in italiano (TAVOLA 1 / PAG. 1, VIGNETTA 1 / VIG. 1.2, EST. LUOGO — NOTTE,
// MARCO: battuta, MARCO (pensiero): …, DIDASCALIA: …, SFX: …) e mette il resto nella descrizione.
import { emptyProject, PRESETS } from '../model/factory';
import { uid } from '../model/id';
import { equal, newPanel, newStrip, normalize } from '../model/layout';
import { resolveProject } from '../model/resolve';
import { INHERITABLE, type ElementType, type FieldKey, type Page, type Panel, type Project, type Strip } from '../model/types';

export interface ImportStats {
  pages: number;
  panels: number;
  elements: number;
  characters: string[];
  places: string[];
  /** Righe che non è stato possibile collocare (prima della prima tavola). */
  skipped: string[];
}

export interface ImportResult {
  project: Project;
  stats: ImportStats;
}

interface DraftPanel {
  panel: Panel;
  /** Dimensioni lette dal file (esportazioni di Scomic): larghezza e altezza in %. */
  size?: { w: number; h: number };
  stripHint: number;
}

interface DraftPage {
  notes: string[];
  panels: DraftPanel[];
}

const RE_RULE = /^[=\-_*~#·.]{3,}$/;
const RE_PAGE = /^(?:tavola|tav\.?|pagina|pag\.?|page)\s*(\d+)\b[\s.:\-–—)]*(.*)$/i;
const RE_STRIP = /^(?:striscia|strip)\s*(\d+)\b[\s.:\-–—)]*(.*)$/i;
const RE_PANEL = /^(?:vignetta|vign\.?|vig\.?|panel|riquadro)\s*(\d+(?:[.,]\d+)?)\b[\s.:\-–—)]*(.*)$/i;
// "[40% × 32% (12,8% della tavola)]" (testo) oppure "40% × 32% (12,8% della tavola) · Luce: …" (Word)
const RE_SIZE = /^\[?\s*(\d+(?:[.,]\d+)?)\s*%\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*%(?:\s*\([^)]*\))?\s*\]?\s*(?:·\s*(.*))?$/i;
const RE_HEADING = /^(int\.?\s*\/\s*est|est\.?\s*\/\s*int|interno\s*\/\s*esterno|int|est|interno|esterno)\b\.?\s*[-–—,:]?\s*(.*)$/i;
const RE_FIELD = /^(luce|illuminazione|inquadratura|campo|luogo|ambiente|ambientazione|momento|ora)\s*:\s*(.+)$/i;
const RE_ELEMENT = /^([^:()]{1,40}?)\s*(?:\(([^)]{1,30})\))?\s*:\s*(.*)$/;
const RE_SPEAKER_ONLY = /^([A-ZÀ-ÖØ-Þ][A-ZÀ-ÖØ-Þ' .\-]{0,30}?)\s*(?:\(([^)]{1,30})\))?\s*:?$/;

const FIELD_ALIASES: Record<string, FieldKey> = {
  luce: 'luce',
  illuminazione: 'luce',
  inquadratura: 'inquadratura',
  campo: 'inquadratura',
  luogo: 'luogo',
  ambientazione: 'luogo',
  ambiente: 'ambiente',
  momento: 'momento',
  ora: 'momento',
};

function num(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

/** "PORTO, MOLO 7" → "Porto, molo 7"; lascia invariato il testo che non è tutto maiuscolo. */
export function softCase(s: string): string {
  const t = s.trim();
  if (!t || t !== t.toUpperCase() || !/[A-ZÀ-Þ]/.test(t)) return t;
  const lower = t.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function normAmbiente(s: string): string {
  const t = s.toLowerCase().replace(/\s+/g, '');
  if (t.includes('/')) return 'INT/EST';
  return t.startsWith('int') ? 'INT' : 'EST';
}

function elementTypeFor(label: string, note: string): ElementType | null {
  const l = label.toLowerCase();
  const n = note.toLowerCase();
  if (/^(didascalia|dida|caption|cartiglio)$/.test(l)) return 'didascalia';
  if (/^(sfx|rumore|rumori|onomatopea|suono|effetto)$/.test(l)) return 'sfx';
  if (/^(nota|note|n\.?b\.?|nota per il disegnatore)$/.test(l)) return 'nota';
  if (!n) return null;
  if (/pensier|pensa/.test(n)) return 'pensiero';
  if (/sussurr|bisbigli|sottovoce/.test(n)) return 'sussurro';
  if (/urlo|urla|grid|strill/.test(n)) return 'urlo';
  if (/fuori\s*campo|f\.?\s*c\.?|\boff\b/.test(n)) return 'fuoricampo';
  return null;
}

/** Un'etichetta prima dei due punti è un nome di personaggio? */
function looksLikeSpeaker(label: string, known: Set<string>): boolean {
  const t = label.trim();
  if (!t || /\d{2,}/.test(t)) return false;
  if (known.has(t.toLowerCase())) return true;
  const words = t.split(/\s+/);
  if (words.length > 4) return false;
  if (t === t.toUpperCase() && /[A-ZÀ-Þ]/.test(t)) return true; // MARCO, IL GUARDIANO
  // Marco, Il Guardiano: ogni parola con l'iniziale maiuscola (articoli brevi ammessi)
  return words.length <= 3 && words.every((w) => /^[A-ZÀ-Þ]/.test(w) || /^(di|del|della|de|da|la|il|lo|le|von|van)$/i.test(w));
}

function cleanLine(raw: string): string {
  return raw
    .replace(/ /g, ' ')
    .replace(/^\s*(?:[-*•]|\d+\))\s+(?=\S)/, '') // elenchi puntati
    .replace(/^#+\s*/, '') // titoli Markdown
    .replace(/\*\*|__/g, '') // grassetto Markdown
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseScript(text: string, knownCharacters: string[] = []): ImportResult {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const known = new Set(knownCharacters.map((c) => c.toLowerCase()));
  const characterNames = new Map<string, string>(); // minuscolo → come scritto
  for (const c of knownCharacters) characterNames.set(c.toLowerCase(), c);

  const pages: DraftPage[] = [];
  let page: DraftPage | null = null;
  let current: DraftPanel | null = null;
  let stripHint = 0;
  let title = '';
  let author = '';
  let subtitle = '';
  const skipped: string[] = [];
  /** Personaggio scritto su una riga da solo (stile sceneggiatura cinematografica). */
  let pendingSpeaker: { name: string; type: ElementType } | null = null;
  /** Ultimo elemento creato da un blocco "NOME" + righe di battuta: le righe successive lo continuano. */
  let blockElement: { text: string } | null = null;

  const ensurePage = (): DraftPage => {
    if (!page) {
      page = { notes: [], panels: [] };
      pages.push(page);
      stripHint = 0;
    }
    return page;
  };
  const ensurePanel = (): DraftPanel => {
    const p = ensurePage();
    if (!current) {
      current = { panel: newPanel(), stripHint };
      p.panels.push(current);
    }
    return current;
  };
  const rememberCharacter = (name: string): string => {
    const key = name.toLowerCase();
    if (!characterNames.has(key)) characterNames.set(key, softCase(name) === name ? name : titleCase(name));
    known.add(key);
    return characterNames.get(key)!;
  };
  const addElement = (type: ElementType, character: string, text: string) => {
    const dp = ensurePanel();
    const el = { id: uid('e'), type, character: character ? rememberCharacter(character) : '', text: text.trim() };
    dp.panel.elements.push(el);
    return el;
  };
  const applyHeading = (dp: DraftPanel, rest: string): boolean => {
    const m = rest.match(RE_HEADING);
    if (!m) return false;
    dp.panel.fields.ambiente = normAmbiente(m[1]);
    const parts = m[2]
      .split(/\s+[—–-]\s+|\s*[—–]\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts[0]) dp.panel.fields.luogo = softCase(parts[0]);
    if (parts.length > 1) dp.panel.fields.momento = softCase(parts[parts.length - 1]);
    return true;
  };
  const applyFieldLine = (dp: DraftPanel, line: string): boolean => {
    const parts = line.split(/\s+·\s+|\s*;\s+/);
    const matches = parts.map((p) => p.match(RE_FIELD));
    if (!matches.every(Boolean)) return false;
    for (const m of matches) {
      const key = FIELD_ALIASES[m![1].toLowerCase()];
      const value = key === 'ambiente' ? normAmbiente(m![2]) : m![2].trim();
      dp.panel.fields[key] = value;
    }
    return true;
  };
  const addDescription = (dp: DraftPanel, line: string) => {
    dp.panel.description = dp.panel.description ? `${dp.panel.description}\n${line}` : line;
  };

  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line) {
      pendingSpeaker = null;
      blockElement = null;
      continue;
    }
    if (RE_RULE.test(line)) continue;

    // Tavola
    const pm = line.match(RE_PAGE);
    if (pm) {
      page = { notes: [], panels: [] };
      pages.push(page);
      current = null;
      stripHint = 0;
      pendingSpeaker = null;
      blockElement = null;
      const rest = pm[2].replace(/^\(?\d+\s+vignett[ae]\)?$/i, '').trim();
      if (rest) page.notes.push(rest);
      continue;
    }
    // Striscia
    const sm = line.match(RE_STRIP);
    if (sm) {
      ensurePage();
      stripHint++;
      current = null;
      pendingSpeaker = null;
      blockElement = null;
      continue;
    }
    // Vignetta
    const vm = line.match(RE_PANEL);
    if (vm) {
      ensurePage();
      current = null;
      pendingSpeaker = null;
      blockElement = null;
      const dp = ensurePanel();
      const rest = vm[2].trim();
      if (rest && !applyHeading(dp, rest)) {
        const shot = matchPreset(rest.replace(/^\(|\)$/g, ''), 'inquadratura');
        if (shot) dp.panel.fields.inquadratura = shot;
        else addDescription(dp, rest);
      }
      continue;
    }

    // Prima della prima tavola: titolo, autore, righe di servizio
    if (!page) {
      const am = line.match(/^(?:di|testi di|soggetto e sceneggiatura di|sceneggiatura di|autore\s*:)\s*(.+)$/i);
      if (am && title && !author) author = am[1].trim();
      else if (!title && !RE_PANEL.test(line) && line.length <= 80 && !RE_ELEMENT.test(line)) title = softCase(line);
      else if (/^formato\s*:/i.test(line)) {
        /* informazione già nel progetto */
      } else if (title && !subtitle && !author && line.length <= 60) subtitle = line;
      else skipped.push(line);
      continue;
    }

    // Dentro una tavola ma prima di qualsiasi vignetta: note della tavola
    if (!current) {
      const nm = line.match(/^note?\s*:\s*(.*)$/i);
      if (nm) {
        page.notes.push(nm[1]);
        continue;
      }
      // Un'intestazione o un dialogo senza "VIGNETTA" apre comunque una vignetta
      if (!RE_HEADING.test(line) && !RE_FIELD.test(line) && !isElementLine(line, known)) {
        page.notes.push(line);
        continue;
      }
    }

    const dp = ensurePanel();

    // Dimensioni scritte dall'esportazione di Scomic: [40% × 32% (12,8% della tavola)]
    const sz = line.match(RE_SIZE);
    if (sz) {
      dp.size = { w: num(sz[1]), h: num(sz[2]) };
      if (sz[3]) applyFieldLine(dp, sz[3].trim());
      continue;
    }
    if (applyFieldLine(dp, line)) continue;
    if (!dp.panel.description && !dp.panel.elements.length && applyHeading(dp, line)) continue;

    // Riga di battuta dopo "NOME" su una riga da sola
    if (pendingSpeaker) {
      const el = addElement(pendingSpeaker.type, pendingSpeaker.name, line);
      blockElement = el;
      pendingSpeaker = null;
      continue;
    }

    // NOME (nota): testo — DIDASCALIA: testo — SFX: testo
    const em = line.match(RE_ELEMENT);
    if (em) {
      const label = em[1].trim();
      const note = (em[2] ?? '').trim();
      const kw = elementTypeFor(label, note);
      const isField = RE_FIELD.test(line);
      if (!isField && (kw === 'didascalia' || kw === 'sfx' || kw === 'nota')) {
        addElement(kw, '', em[3]);
        blockElement = null;
        continue;
      }
      if (!isField && looksLikeSpeaker(label, known)) {
        if (em[3].trim()) addElement(kw ?? 'balloon', label, em[3]);
        else pendingSpeaker = { name: label, type: kw ?? 'balloon' };
        blockElement = null;
        continue;
      }
    }

    // NOME da solo su una riga (tutto maiuscolo), la battuta segue sotto
    const so = line.match(RE_SPEAKER_ONLY);
    if (so && so[1].trim().split(/\s+/).length <= 4 && line === line.toUpperCase()) {
      const label = so[1].trim();
      const kw = elementTypeFor(label, (so[2] ?? '').trim());
      if (kw === 'didascalia' || kw === 'sfx' || kw === 'nota') pendingSpeaker = { name: '', type: kw };
      else pendingSpeaker = { name: label, type: kw ?? 'balloon' };
      blockElement = null;
      continue;
    }

    // Continuazione di una battuta scritta su più righe
    if (blockElement) {
      blockElement.text = `${blockElement.text} ${line}`;
      continue;
    }

    addDescription(dp, line);
  }

  // Nessuna tavola trovata ma testo presente: tutto in una tavola
  if (!pages.length) pages.push({ notes: [], panels: [{ panel: newPanel(), stripHint: 0 }] });

  const project = emptyProject();
  project.title = title || 'Sceneggiatura importata';
  project.author = author;
  project.subtitle = subtitle;
  project.pages = pages.map(buildPage);
  compactInherited(project);

  const places = new Map<string, string>();
  let panels = 0;
  let elements = 0;
  for (const p of project.pages)
    for (const s of p.strips)
      for (const v of s.panels) {
        panels++;
        elements += v.elements.length;
        const l = (v.fields.luogo ?? '').trim();
        if (l && !places.has(l.toLowerCase())) places.set(l.toLowerCase(), l);
      }
  const usedCharacters = new Map<string, string>();
  for (const p of project.pages)
    for (const s of p.strips)
      for (const v of s.panels)
        for (const e of v.elements) if (e.character) usedCharacters.set(e.character.toLowerCase(), e.character);

  project.characters = [...usedCharacters.values()].map((name) => ({ id: uid('c'), name, notes: '' }));
  project.places = [...places.values()].map((name) => ({ id: uid('l'), name }));

  return {
    project,
    stats: {
      pages: project.pages.length,
      panels,
      elements,
      characters: [...usedCharacters.values()],
      places: [...places.values()],
      skipped,
    },
  };
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) => (/^(di|del|della|de|da)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
}

function matchPreset(s: string, key: FieldKey): string | null {
  const t = s.trim().toLowerCase();
  if (!t || t.length > 40) return null;
  const hit = PRESETS[key].find((p) => p.toLowerCase() === t || t.startsWith(p.toLowerCase()));
  return hit ? softCase(s.trim()) : null;
}

function isElementLine(line: string, known: Set<string>): boolean {
  const em = line.match(RE_ELEMENT);
  if (!em) return false;
  const kw = elementTypeFor(em[1].trim(), (em[2] ?? '').trim());
  return kw === 'didascalia' || kw === 'sfx' || (looksLikeSpeaker(em[1], known) && em[1] === em[1].toUpperCase());
}

/** Ricostruisce strisce e larghezze: dai dati del file se ci sono, altrimenti con una griglia ragionevole. */
function buildPage(dp: DraftPage): Page {
  if (!dp.panels.length && dp.notes.length) {
    // Tavola senza vignette indicate: il testo diventa la descrizione di un'unica vignetta
    const p = newPanel();
    p.description = dp.notes.join('\n');
    dp = { notes: [], panels: [{ panel: p, stripHint: 0 }] };
  }
  const panels = dp.panels.length ? dp.panels : [{ panel: newPanel(), stripHint: 0 }];
  let strips: Strip[];

  if (panels.every((p) => p.size)) {
    // Esportazione di Scomic: vignette consecutive con la stessa altezza formano una striscia
    strips = [];
    let row: DraftPanel[] = [];
    let sum = 0;
    const flush = () => {
      if (!row.length) return;
      const ws = normalize(row.map((r) => r.size!.w));
      row.forEach((r, i) => (r.panel.width = ws[i]));
      strips.push(newStrip(row[0].size!.h, row.map((r) => r.panel)));
      row = [];
      sum = 0;
    };
    for (const p of panels) {
      if (row.length && (Math.abs(p.size!.h - row[0].size!.h) > 0.6 || sum + p.size!.w > 100.6)) flush();
      row.push(p);
      sum += p.size!.w;
      if (sum >= 99.4) flush();
    }
    flush();
  } else if (panels.some((p) => p.stripHint > 0)) {
    // Il file indica le strisce (STRISCIA 1, STRISCIA 2…)
    const groups = new Map<number, Panel[]>();
    for (const p of panels) groups.set(p.stripHint, [...(groups.get(p.stripHint) ?? []), p.panel]);
    strips = [...groups.values()].map((ps) => {
      const ws = equal(ps.length);
      ps.forEach((p, i) => (p.width = ws[i]));
      return newStrip(1, ps);
    });
  } else {
    // Nessuna indicazione: fino a 3 vignette una per striscia, poi righe da 2 (o da 3 oltre le 8)
    const n = panels.length;
    const perRow = n <= 3 ? 1 : n <= 8 ? 2 : 3;
    strips = [];
    for (let i = 0; i < n; i += perRow) {
      const ps = panels.slice(i, i + perRow).map((p) => p.panel);
      const ws = equal(ps.length);
      ps.forEach((p, j) => (p.width = ws[j]));
      strips.push(newStrip(1, ps));
    }
  }

  const hs = normalize(strips.map((s) => s.height));
  strips.forEach((s, i) => (s.height = hs[i]));
  return { id: uid('t'), notes: dp.notes.join('\n'), strips };
}

/** Toglie i valori uguali a quelli della vignetta precedente: diventano "ripresi in automatico". */
export function compactInherited(project: Project): void {
  const resolved = resolveProject(project);
  const prevValue: Partial<Record<FieldKey, string>> = {};
  for (const rp of resolved.pages.flatMap((p) => p.panels)) {
    for (const key of INHERITABLE) {
      const own = (rp.panel.fields[key] ?? '').trim();
      if (!own) continue;
      if (prevValue[key] !== undefined && prevValue[key]!.toLowerCase() === own.toLowerCase()) delete rp.panel.fields[key];
      prevValue[key] = own;
    }
  }
}

// --- Word (.docx) -----------------------------------------------------------

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

/** Testo dei paragrafi di word/document.xml, un paragrafo per riga. */
export function docxXmlToText(xml: string): string {
  const body = xml.replace(/<w:del\b[\s\S]*?<\/w:del>/g, ''); // revisioni cancellate
  const paragraphs = body.split(/<\/w:p>/);
  const out: string[] = [];
  for (const p of paragraphs) {
    let text = '';
    const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(p))) {
      if (m[1] !== undefined) text += decodeXml(m[1]);
      else if (m[0] === '<w:tab/>') text += ' ';
      else text += '\n';
    }
    out.push(text);
  }
  return out.join('\n');
}

export async function docxToText(data: ArrayBuffer): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(data);
  const doc = zip.file('word/document.xml');
  if (!doc) throw new Error('Il file non sembra un documento Word (.docx).');
  return docxXmlToText(await doc.async('string'));
}

/** Legge un file scelto dall'utente: .docx, .txt, .md o un progetto Scomic esportato in testo. */
export async function fileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.doc') && !name.endsWith('.docx')) {
    const head = await file.slice(0, 512).text();
    // I file .doc salvati da Scomic sono pagine HTML: si leggono come testo
    if (/<html|<!doctype/i.test(head)) return htmlToText(await file.text());
    throw new Error('Il vecchio formato .doc non si può leggere: in Word usa "Salva con nome" e scegli .docx.');
  }
  if (name.endsWith('.docx')) return docxToText(await file.arrayBuffer());
  if (name.endsWith('.html') || name.endsWith('.htm')) return htmlToText(await file.text());
  return file.text();
}

function htmlToText(html: string): string {
  return decodeXml(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h\d|div|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  ).replace(/&nbsp;/g, ' ');
}
