# Tavole: sceneggiature per fumetti

Editor per scrivere sceneggiature a fumetti, con l'anteprima della tavola in proporzione.

## Cosa fa (prototipo 0.1)

- **Struttura fissa**: Tavola → Striscia → Vignetta, con numerazione automatica (1.1, 1.2…). Si aggiorna da sola quando sposti, aggiungi o elimini.
- **Campi di ogni vignetta**: ambiente (INT/EST), luogo, momento, luce, inquadratura, descrizione, balloon, pensieri, sussurri, urli, fuori campo, didascalie, SFX e note per il disegnatore.
- **Ripresa automatica**: se lasci vuoti ambiente, luogo, momento o luce, la vignetta li riprende dalla precedente, anche dalla tavola prima. Le etichette tratteggiate con ↺ sono riprese; quelle piene sono scritte in quella vignetta.
- **Suggerimenti**: personaggi, luoghi e valori già usati vengono proposti mentre scrivi. I nomi nuovi entrano da soli nell'archivio.
- **Archivio**: rinomini un personaggio o un luogo e il nome cambia in tutta la sceneggiatura.
- **Anteprima della tavola** nel formato scelto (bonelliano, francese, A4, comic USA, manga B6 o su misura):
  - percentuali di ogni striscia e vignetta e la parte di tavola che occupa;
  - bordi da trascinare col mouse (o con le frecce della tastiera);
  - griglie pronte (splash, gabbia 3×2, griglia 9…).
- **Controllo testo**: segnala le vignette con troppe parole per lo spazio. La soglia si cambia dal menu File.
- **Menabò**: tutte le tavole in miniatura, a coppie come nell'albo stampato.
- **Stampa ed esporta** nel formato classico:
  - PDF (dalla stampa del browser), file per Word (.doc) e testo (.txt);
  - a scelta, ripete in ogni vignetta i dati ripresi dalla precedente.
- **Salvataggio automatico** nel browser, più salvataggio e apertura del progetto come file `.tavole.json`.
- **Annulla e ripeti**: Ctrl+Z / Ctrl+Y.

### Scorciatoie da tastiera

| Tasti | Azione |
|---|---|
| Invio (nel testo di un balloon) | nuovo elemento dello stesso tipo |
| Maiusc + Invio | a capo nello stesso balloon |
| Ctrl + Invio | nuova vignetta |
| Backspace su un elemento vuoto | lo elimina |
| Ctrl + Z / Ctrl + Y | annulla / ripeti |

## Come avviarla

Serve [Node.js](https://nodejs.org) 18 o superiore.

```bash
cd tavole
npm install
npm run dev        # apre l'app su http://localhost:5173
```

Altri comandi:

```bash
npm test               # test della logica (ripresa dei campi, geometria, densità)
npm run build          # versione pronta da pubblicare in dist/
npm run build:single   # un unico file dist-single/index.html da aprire con un doppio clic
```

## Struttura del codice

```
src/
  model/       dati e calcoli puri (tipi, formati, geometria della tavola, ripresa dei campi)
  store/       stato dell'app, annulla/ripeti, salvataggio automatico, azioni
  components/  interfaccia (editor, anteprima, menabò, stampa)
  io/          file di progetto ed esportazioni
```

## Prossimi passi possibili

- Vignette a cavallo di più strisce e forme irregolari.
- Esportazione .docx vera, con stili di paragrafo.
- App installabile e utilizzabile senza internet (PWA) o app desktop.
- Commenti e condivisione con il disegnatore.
