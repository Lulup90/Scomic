// Esportazione in un vero documento Word (.docx), con stili di paragrafo:
// "Titolo 1" per le tavole e "Titolo 2" per le vignette, così in Word il riquadro di
// spostamento mostra la struttura dell'albo e gli stili si possono cambiare in un colpo solo.
import { pageSize } from '../model/formats';
import type { Project } from '../model/types';
import { buildExport, storyParagraphs, vignette, type ExportOptions } from './exporters';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function runs(text: string, rPr = ''): string {
  // Le righe a capo dentro lo stesso paragrafo diventano interruzioni di riga
  return text
    .split('\n')
    .map((line, i) => `${i ? '<w:r><w:br/></w:r>' : ''}<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(line)}</w:t></w:r>`)
    .join('');
}

function para(style: string, content: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${content}</w:p>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New" w:eastAsia="Courier New"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="it-IT"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:caps/><w:sz w:val="36"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="center"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="000000"/></w:pBdr><w:spacing w:after="200"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="280" w:after="40"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Sezione"><w:name w:val="Sezione"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="120"/></w:pPr><w:rPr><w:b/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Dettagli"><w:name w:val="Dettagli vignetta"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/></w:pPr><w:rPr><w:color w:val="555555"/><w:sz w:val="18"/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="NoteTavola"><w:name w:val="Note tavola"/><w:basedOn w:val="Normal"/><w:rPr><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Descrizione"><w:name w:val="Descrizione"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="80" w:after="120"/></w:pPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Battuta"><w:name w:val="Battuta"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Didascalia"><w:name w:val="Didascalia"/><w:basedOn w:val="Battuta"/><w:rPr><w:i/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="SFX"><w:name w:val="SFX"/><w:basedOn w:val="Battuta"/></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Nota"><w:name w:val="Nota per il disegnatore"/><w:basedOn w:val="Battuta"/><w:rPr><w:color w:val="555555"/></w:rPr></w:style>
</w:styles>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

function coreXml(project: Project): string {
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${esc(project.title)}</dc:title>
<dc:creator>${esc(project.author || 'Scomic')}</dc:creator>
<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

const STYLE_FOR: Record<string, string> = { didascalia: 'Didascalia', sfx: 'SFX', nota: 'Nota' };

export function documentXml(project: Project, opts: ExportOptions): string {
  const pages = buildExport(project, opts);
  const size = pageSize(project);
  const body: string[] = [];
  body.push(para('Title', runs(project.title)));
  if (project.subtitle) body.push(para('Subtitle', runs(project.subtitle)));
  if (project.author) body.push(para('Subtitle', runs(`di ${project.author}`)));
  body.push(para('Subtitle', runs(`Formato: ${size.name} (${size.label})`, '<w:color w:val="555555"/><w:sz w:val="18"/>')));

  if (opts.includeStory !== false) {
    if (project.logline.trim()) body.push(para('Sezione', runs('LOGLINE: ', '<w:b/>') + runs(project.logline.trim(), '<w:b w:val="0"/>')));
    const soggetto = storyParagraphs(project.soggetto);
    if (soggetto.length) {
      body.push(para('Sezione', runs('SOGGETTO')));
      for (const s of soggetto) body.push(para('Descrizione', runs(s)));
    }
  }

  for (const p of pages) {
    body.push(para('Heading1', runs(`TAVOLA ${p.number}`) + runs(`  (${vignette(p.panelCount)})`, '<w:b w:val="0"/><w:sz w:val="18"/>')));
    if (opts.includeNotes && p.notes.trim()) body.push(para('NoteTavola', runs(`Note: ${p.notes.trim()}`)));
    for (const v of p.panels) {
      body.push(para('Heading2', runs(`VIGNETTA ${v.number}${v.heading ? ` — ${v.heading}` : ''}`)));
      body.push(para('Dettagli', runs([v.size, ...v.details].join(' · '))));
      if (v.description.trim()) body.push(para('Descrizione', runs(v.description.trim())));
      for (const e of v.elements) {
        body.push(para(STYLE_FOR[e.kind] ?? 'Battuta', runs(`${e.label}: `, '<w:b/>') + runs(e.text.trim())));
      }
    }
  }

  // A4 verticale, margini di 2,5 cm
  const sect =
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}${sect}</w:body></w:document>`;
}

/** Crea il file .docx e lo restituisce come Blob. */
export async function exportDocx(project: Project, opts: ExportOptions): Promise<Blob> {
  return (await buildDocx(project, opts, 'blob')) as Blob;
}

export async function buildDocx(project: Project, opts: ExportOptions, type: 'blob' | 'uint8array'): Promise<Blob | Uint8Array> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', ROOT_RELS);
  zip.file('docProps/core.xml', coreXml(project));
  zip.file('word/document.xml', documentXml(project, opts));
  zip.file('word/styles.xml', STYLES);
  zip.file('word/_rels/document.xml.rels', DOC_RELS);
  return zip.generateAsync({
    type,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  });
}
