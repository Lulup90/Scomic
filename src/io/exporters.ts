// Esportazione della sceneggiatura in formato classico (testo, Word, stampa).
import { fmtNum, pageSize } from '../model/formats';
import { resolveProject, type ResolvedPanel } from '../model/resolve';
import { ELEMENT_TYPES, type Project, type ScriptElement } from '../model/types';

export interface ExportOptions {
  /** Ripete in ogni vignetta anche i dati ripresi dalla precedente. */
  repeatInherited: boolean;
  includeNotes: boolean;
}

export interface ExportPanel {
  number: string;
  heading: string; // es. "EST. PORTO, MOLO 7 — NOTTE"
  details: string[]; // es. ["Luce: …", "Inquadratura: …"]
  description: string;
  elements: { label: string; text: string; kind: ScriptElement['type'] }[];
  size: string;
}

export interface ExportPage {
  number: number;
  notes: string;
  panelCount: number;
  panels: ExportPanel[];
}

const typeLabel = (t: ScriptElement['type']) => ELEMENT_TYPES.find((x) => x.type === t)?.label ?? t;

function elementLabel(e: ScriptElement): string {
  switch (e.type) {
    case 'didascalia':
      return 'DIDASCALIA';
    case 'sfx':
      return 'SFX';
    case 'nota':
      return 'NOTA';
    case 'balloon':
      return (e.character || 'PERSONAGGIO').toUpperCase();
    default:
      return `${(e.character || 'PERSONAGGIO').toUpperCase()} (${typeLabel(e.type).toLowerCase()})`;
  }
}

function panelHeading(rp: ResolvedPanel, opts: ExportOptions): { heading: string; details: string[] } {
  const show = (k: keyof ResolvedPanel['fields']) => {
    const f = rp.fields[k];
    if (!f.value) return '';
    if (f.inherited && !opts.repeatInherited) return '';
    return f.value;
  };
  const amb = show('ambiente');
  const luogo = show('luogo');
  const momento = show('momento');
  const place = [amb ? `${amb}.` : '', luogo].filter(Boolean).join(' ');
  const heading = [place, momento].filter(Boolean).join(' — ').toUpperCase();
  const details: string[] = [];
  const luce = show('luce');
  const inq = show('inquadratura');
  if (inq) details.push(`Inquadratura: ${inq}`);
  if (luce) details.push(`Luce: ${luce}`);
  return { heading, details };
}

export function buildExport(project: Project, opts: ExportOptions): ExportPage[] {
  const resolved = resolveProject(project);
  return project.pages.map((page, i) => {
    const rpage = resolved.byPage[page.id];
    return {
      number: i + 1,
      notes: page.notes,
      panelCount: rpage.panels.length,
      panels: rpage.panels.map((rp) => {
        const { heading, details } = panelHeading(rp, opts);
        return {
          number: rp.number,
          heading,
          details,
          description: rp.panel.description,
          size: `${fmtNum(rp.width)}% × ${fmtNum(rp.height)}% (${fmtNum(rp.area)}% della tavola)`,
          elements: rp.panel.elements
            .filter((e) => opts.includeNotes || e.type !== 'nota')
            .map((e) => ({ label: elementLabel(e), text: e.text, kind: e.type })),
        };
      }),
    };
  });
}

export function exportText(project: Project, opts: ExportOptions): string {
  const pages = buildExport(project, opts);
  const size = pageSize(project);
  const out: string[] = [];
  out.push(project.title.toUpperCase());
  if (project.subtitle) out.push(project.subtitle);
  if (project.author) out.push(`di ${project.author}`);
  out.push(`Formato: ${size.name} (${size.label})`, '');
  for (const p of pages) {
    out.push('='.repeat(48), `TAVOLA ${p.number}  (${vignette(p.panelCount)})`, '='.repeat(48));
    if (opts.includeNotes && p.notes.trim()) out.push(`Note: ${p.notes.trim()}`);
    out.push('');
    for (const v of p.panels) {
      out.push(`VIGNETTA ${v.number}${v.heading ? ` — ${v.heading}` : ''}`);
      out.push(`[${v.size}]`);
      for (const d of v.details) out.push(d);
      if (v.description.trim()) out.push('', v.description.trim());
      if (v.elements.length) out.push('');
      for (const e of v.elements) out.push(`    ${e.label}: ${e.text.trim()}`);
      out.push('');
    }
  }
  return out.join('\n');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

/** Documento HTML che Word apre come documento modificabile (.doc). */
export function exportWordHtml(project: Project, opts: ExportOptions): string {
  const pages = buildExport(project, opts);
  const size = pageSize(project);
  const body = pages
    .map(
      (p) => `
<h2>TAVOLA ${p.number} <span class="small">(${vignette(p.panelCount)})</span></h2>
${opts.includeNotes && p.notes.trim() ? `<p class="note">${esc(p.notes)}</p>` : ''}
${p.panels
  .map(
    (v) => `
<h3>VIGNETTA ${v.number}${v.heading ? ` — ${esc(v.heading)}` : ''}</h3>
<p class="small">${esc(v.size)}${v.details.length ? ' · ' + v.details.map(esc).join(' · ') : ''}</p>
${v.description.trim() ? `<p class="desc">${esc(v.description)}</p>` : ''}
${v.elements.map((e) => `<p class="el"><b>${esc(e.label)}:</b> ${esc(e.text)}</p>`).join('')}
`,
  )
  .join('')}`,
    )
    .join('<br style="page-break-before:always">');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${esc(project.title)}</title>
<style>
body{font-family:'Courier New',Courier,monospace;font-size:12pt;line-height:1.4}
h1{font-size:18pt;text-align:center}h2{font-size:14pt;border-bottom:1px solid #000;margin-top:24pt}
h3{font-size:12pt;margin:14pt 0 2pt}.small{font-size:9pt;color:#444;font-weight:normal}
.desc{margin:4pt 0}.el{margin:2pt 0 2pt 36pt}.note{font-style:italic}
</style></head><body>
<h1>${esc(project.title)}</h1>
${project.subtitle ? `<p style="text-align:center">${esc(project.subtitle)}</p>` : ''}
${project.author ? `<p style="text-align:center">di ${esc(project.author)}</p>` : ''}
<p style="text-align:center" class="small">Formato: ${esc(size.name)} (${esc(size.label)})</p>
${body}
</body></html>`;
}

export function vignette(n: number): string {
  return `${n} ${n === 1 ? 'vignetta' : 'vignette'}`;
}

export function fileSafeName(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'sceneggiatura'
  );
}
