import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { sampleProject } from '../model/factory';
import { resolveProject } from '../model/resolve';
import { buildDocx } from './docx';
import { docxXmlToText, parseScript } from './importer';

describe('esportazione .docx', () => {
  it('crea un documento Word valido che Scomic sa rileggere', async () => {
    const original = sampleProject();
    const bytes = (await buildDocx(original, { repeatInherited: true, includeNotes: true }, 'uint8array')) as Uint8Array;
    const zip = await JSZip.loadAsync(bytes);
    for (const f of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels'])
      expect(zip.file(f), f).not.toBeNull();

    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('<w:pStyle w:val="Heading1"/>');
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;)/); // caratteri speciali tutti codificati

    const { project } = parseScript(docxXmlToText(xml));
    const a = resolveProject(original);
    const b = resolveProject(project);
    expect(b.pages.map((p) => p.panels.length)).toEqual(a.pages.map((p) => p.panels.length));
    expect(b.pages[1].panels[4].panel.elements[0].text).toBe(a.pages[1].panels[4].panel.elements[0].text);
    expect(Math.round(b.pages[1].panels[0].width)).toBe(40);
    expect(b.pages[1].panels[2].fields.luce.value).toBe('Fascio del faro, intermittente');
  });
});
