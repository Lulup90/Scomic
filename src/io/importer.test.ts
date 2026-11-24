import { describe, expect, it } from 'vitest';
import { sampleProject } from '../model/factory';
import { resolveProject } from '../model/resolve';
import { exportText } from './exporters';
import { docxXmlToText, parseScript, softCase } from './importer';

describe('importazione', () => {
  it('rilegge fedelmente una sceneggiatura esportata in testo da Scomic', () => {
    const original = sampleProject();
    const text = exportText(original, { repeatInherited: true, includeNotes: true });
    const { project, stats } = parseScript(text);

    expect(project.title).toBe('Il porto delle nebbie');
    expect(stats.pages).toBe(3);
    expect(stats.skipped).toEqual([]);
    expect(project.subtitle).toBe('Albo 1');

    const a = resolveProject(original);
    const b = resolveProject(project);
    expect(b.pages.map((p) => p.panels.length)).toEqual(a.pages.map((p) => p.panels.length));
    expect(project.pages.map((p) => p.strips.length)).toEqual(original.pages.map((p) => p.strips.length));
    expect(project.pages[0].notes).toBe(original.pages[0].notes);

    a.pages.forEach((pa, i) =>
      pa.panels.forEach((va, j) => {
        const vb = b.pages[i].panels[j];
        expect(vb.panel.description).toBe(va.panel.description);
        expect(Math.round(vb.width)).toBe(Math.round(va.width));
        expect(Math.round(vb.height)).toBe(Math.round(va.height));
        for (const k of ['ambiente', 'luogo', 'momento', 'luce', 'inquadratura'] as const)
          expect(vb.fields[k].value.toLowerCase()).toBe(va.fields[k].value.toLowerCase());
        expect(vb.panel.elements.map((e) => [e.type, e.character.toLowerCase(), e.text])).toEqual(
          va.panel.elements.map((e) => [e.type, e.character.toLowerCase(), e.text]),
        );
      }),
    );
    // i valori ripetuti tornano a essere "ripresi" automaticamente
    expect(b.pages[1].panels[1].fields.luogo.inherited).toBe(true);
  });

  it('riconosce una sceneggiatura scritta a mano in Word', () => {
    const text = `IL FARO
di Luca

PAGINA 1
Pagina d'atmosfera, molto silenziosa.

Vignetta 1 – EST. SCOGLIERA – ALBA
Campo lunghissimo. Il faro sulla scogliera, il mare agitato.
DIDASCALIA: Capo Nord, 1953.

Vignetta 2 (primo piano)
Anna guarda il mare.
Luce: controluce
ANNA (pensiero): Tornerà.
SFX: SPLASH

PAGINA 2
VIG. 1 - INT. FARO - NOTTE
Anna sale la scala a chiocciola.
ANNA
Chi c'è?
Rispondi!
VIG. 2
Un'ombra sul pianerottolo.
Il Guardiano (fuori campo): Ti aspettavo.
Nota: l'ombra deve essere enorme.
`;
    const { project, stats } = parseScript(text);
    expect(project.title).toBe('Il faro');
    expect(project.author).toBe('Luca');
    expect(stats.pages).toBe(2);
    expect(stats.panels).toBe(4);
    expect(project.pages[0].notes).toBe("Pagina d'atmosfera, molto silenziosa.");

    const r = resolveProject(project);
    const [v11, v12] = r.pages[0].panels;
    expect(v11.fields.ambiente.value).toBe('EST');
    expect(v11.fields.luogo.value).toBe('Scogliera');
    expect(v11.fields.momento.value).toBe('Alba');
    expect(v11.panel.elements[0]).toMatchObject({ type: 'didascalia', text: 'Capo Nord, 1953.' });

    expect(v12.fields.inquadratura.value).toBe('primo piano');
    expect(v12.fields.luce.value).toBe('controluce');
    expect(v12.fields.luogo).toMatchObject({ value: 'Scogliera', inherited: true });
    expect(v12.panel.elements.map((e) => [e.type, e.character])).toEqual([
      ['pensiero', 'Anna'],
      ['sfx', ''],
    ]);

    const [v21, v22] = r.pages[1].panels;
    expect(v21.fields.ambiente.value).toBe('INT');
    expect(v21.panel.elements).toHaveLength(1);
    expect(v21.panel.elements[0]).toMatchObject({ type: 'balloon', character: 'Anna', text: "Chi c'è? Rispondi!" });
    expect(v22.panel.elements.map((e) => [e.type, e.character])).toEqual([
      ['fuoricampo', 'Il Guardiano'],
      ['nota', ''],
    ]);
    expect(stats.characters.sort()).toEqual(['Anna', 'Il Guardiano']);
    expect(stats.places.sort()).toEqual(['Faro', 'Scogliera']);
  });

  it('senza indicazioni di vignetta mette il testo in una vignetta per tavola', () => {
    const { project } = parseScript('TAVOLA 1\nUna stanza vuota.\nTAVOLA 2\nUna finestra.');
    expect(project.pages).toHaveLength(2);
    expect(project.pages[0].strips[0].panels[0].description).toBe('Una stanza vuota.');
  });

  it('le righe di descrizione con due punti non diventano battute', () => {
    const { project } = parseScript('TAVOLA 1\nVIGNETTA 1\nsullo sfondo: il porto in fiamme, nessuno in giro.');
    const v = project.pages[0].strips[0].panels[0];
    expect(v.elements).toHaveLength(0);
    expect(v.description).toContain('il porto in fiamme');
  });

  it('estrae i paragrafi da un documento Word', () => {
    const xml =
      '<w:document><w:body><w:p><w:r><w:t>TAVOLA 1</w:t></w:r></w:p>' +
      '<w:p><w:r><w:t xml:space="preserve">MARCO: </w:t></w:r><w:r><w:t>Ciao &amp; addio</w:t></w:r></w:p>' +
      '<w:p><w:del><w:r><w:t>cancellato</w:t></w:r></w:del></w:p></w:body></w:document>';
    expect(docxXmlToText(xml).split('\n').filter(Boolean)).toEqual(['TAVOLA 1', 'MARCO: Ciao & addio']);
  });

  it('softCase', () => {
    expect(softCase('PORTO, MOLO 7')).toBe('Porto, molo 7');
    expect(softCase('Bar Ancora')).toBe('Bar Ancora');
  });
});
