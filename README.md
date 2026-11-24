# Scomic

Editor per scrivere sceneggiature a fumetti, con l'anteprima della tavola in proporzione.

**Provalo online:** https://lulup90.github.io/Scomic/

## Cosa fa (versione 0.2)

- **Logline e soggetto** in cima alla colonna laterale.
  - Si aprono come finestre che si spostano e si ridimensionano, e restano aperte mentre scrivi le tavole.
  - Contano parole e cartelle.
  - Si esportano a parte, come documento separato dalla sceneggiatura (*Stampa ed esporta → Soggetto e logline*: PDF, Word, testo).
- **Tavole a tendina**: la lista delle tavole si apre e si chiude con un clic.
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
- **Importa da Word o testo** (menu File): legge file `.docx`, `.txt` e `.md`, o testo incollato.
  - Riconosce tavole (TAVOLA / PAGINA / PAG.), strisce, vignette (VIGNETTA / VIG.), intestazioni come `EST. PORTO — NOTTE`, righe `Luce:` e `Inquadratura:`.
  - Riconosce battute (`MARCO: …`, `MARCO (pensiero): …` o il nome da solo su una riga con la battuta sotto), didascalie, SFX e note.
  - Prima di importare mostra un'anteprima con tavole, vignette, personaggi e luoghi trovati. Si può importare come nuovo progetto o aggiungere in fondo.
- **Una tavola per pagina** in tutte le esportazioni: ogni tavola comincia su una pagina nuova. Se una tavola non sta in una pagina continua sulla successiva, che resta bianca fino alla tavola dopo.
  - L'anteprima mostra i fogli A4 reali, con il segno di dove comincia la pagina successiva.
  - Un avviso dice quali tavole occupano più di una pagina.
- **Stampa ed esporta** nel formato classico:
  - PDF (dalla stampa del browser);
  - **Word .docx vero**, con stili di paragrafo: "Titolo 1" per le tavole, "Titolo 2" per le vignette, Battuta, Didascalia, ecc.;
  - testo (.txt);
  - a scelta, ripete in ogni vignetta i dati ripresi dalla precedente.
- **Salvataggio su file collegato**: con *Salva* (Ctrl+S) scegli un file `.scomic.json` e da lì ogni modifica viene scritta da sola in quel file (Chrome ed Edge).
  - Negli altri browser il file viene scaricato.
  - In alto c'è sempre l'indicazione di dove è salvato il lavoro.
  - Dopo molte modifiche salvate solo nel browser compare un promemoria.
- **Passa il progetto a un'altra persona** (pulsante *Condividi*):
  - **link** che contiene tutto il progetto compresso. Chi lo apre se lo trova in Scomic dopo una conferma. Il progetto sta dopo il `#` dell'indirizzo, che il browser non invia mai al server;
  - **file** `.scomic.json` da allegare, oppure *Invia con…* dove il dispositivo lo permette;
  - **Word/PDF** per chi deve solo leggere.

  Chi riceve ottiene una copia: le sue modifiche non cambiano l'originale.
- **Salvataggio automatico** anche nel browser.
- **App installabile** dal menu File (Chrome, Edge), utilizzabile anche senza internet.
- **Annulla e ripeti**: Ctrl+Z / Ctrl+Y.

### Scorciatoie da tastiera

| Tasti | Azione |
|---|---|
| Invio (nel testo di un balloon) | nuovo elemento dello stesso tipo |
| Maiusc + Invio | a capo nello stesso balloon |
| Ctrl + Invio | nuova vignetta |
| Backspace su un elemento vuoto | lo elimina |
| Ctrl + Z / Ctrl + Y | annulla / ripeti |
| Ctrl + S | salva su file |

## Come avviarla

Serve [Node.js](https://nodejs.org) 18 o superiore.

```bash
npm install
npm run dev        # apre l'app su http://localhost:5173
```

Altri comandi:

```bash
npm test               # test della logica (ripresa dei campi, geometria, densità)
npm run build          # versione pronta da pubblicare in dist/
npm run build:single   # un unico file dist-single/index.html da aprire con un doppio clic
```

## Pagina pubblica (GitHub Pages)

Ogni push sul branch `main` esegue i test, compila l'app e la pubblica su
https://lulup90.github.io/Scomic/ (workflow `.github/workflows/pages.yml`).

Da fare una volta sola, dopo il primo push: su GitHub apri **Settings → Pages** e
in **Build and deployment → Source** scegli **GitHub Actions**. Il repository deve essere pubblico
(o serve un piano GitHub che permetta Pages sui repository privati).

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
- Margini e spazi tra le vignette in millimetri, come sulla tavola stampata.
- Balloon disegnati nell'anteprima in proporzione al testo.
- Riordino trascinando tavole, vignette e balloon; cerca e sostituisci.
- Commenti e condivisione con il disegnatore.
