// Trasforma dist-artifact/index.html (documento completo) nel contenuto di pagina
// che si pubblica come Artifact: titolo, font, stili e script, senza doctype/html/head/body.
// Il codice dell'app contiene a sua volta stringhe come "</head>" (l'esportazione per Word),
// quindi i pezzi si individuano per posizione e non con espressioni regolari sull'intero file.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync(new URL('../dist-artifact/index.html', import.meta.url), 'utf8');

function block(open, close, from = 0) {
  const start = src.indexOf(open, from);
  if (start < 0) return null;
  const end = src.indexOf(close, start);
  if (end < 0) throw new Error(`Manca ${close}`);
  return { start, end: end + close.length, text: src.slice(start, end + close.length) };
}

const script = block('<script type="module"', '</script>');
if (!script) throw new Error('Script non trovato');
const head = src.slice(0, script.start);
const title = head.match(/<title>[^<]*<\/title>/i)?.[0];
const fonts = head.match(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/i)?.[0] ?? '';
const styleBefore = head.indexOf('<style') >= 0 ? block('<style', '</style>') : null;
const style = styleBefore ?? block('<style', '</style>', script.end);
const bodyStart = src.lastIndexOf('<body>');
const bodyEnd = src.lastIndexOf('</body>');
const body = src.slice(bodyStart + '<body>'.length, bodyEnd).trim();
if (!title || !style || !body.includes('id="root"')) throw new Error('Build inattesa');

const out = [title, fonts, style.text, body, script.text].join('\n');
writeFileSync(new URL('../dist-artifact/scomic.html', import.meta.url), out);
console.log(`dist-artifact/scomic.html: ${(out.length / 1024).toFixed(0)} kB`);
