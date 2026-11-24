import { uid } from './id';
import { newPage } from './layout';
import type { ElementType, FieldKey, Page, Panel, Project, ScriptElement } from './types';

/** Valori proposti nei suggerimenti anche prima di averli usati. */
export const PRESETS: Record<FieldKey, string[]> = {
  ambiente: ['INT', 'EST', 'INT/EST'],
  luogo: [],
  momento: ['Giorno', 'Notte', 'Alba', 'Tramonto', 'Mattina', 'Pomeriggio', 'Sera'],
  luce: ['Luce naturale', 'Controluce', 'Luce artificiale', 'Penombra', 'Buio', 'Neon', 'Luce radente'],
  inquadratura: [
    'Campo lunghissimo',
    'Campo lungo',
    'Campo medio',
    'Figura intera',
    'Piano americano',
    'Mezza figura',
    'Primo piano',
    'Primissimo piano',
    'Dettaglio',
    'Controcampo',
    'Soggettiva',
    'Dall’alto (plongée)',
    'Dal basso (contre-plongée)',
  ],
};

export function emptyProject(): Project {
  return {
    version: 1,
    title: 'Nuova storia',
    subtitle: '',
    author: '',
    logline: '',
    soggetto: '',
    format: 'bonelli',
    customSize: { w: 17, h: 24 },
    densityThreshold: 2,
    characters: [],
    places: [],
    pages: [newPage()],
  };
}

function el(type: ElementType, text: string, character = ''): ScriptElement {
  return { id: uid('e'), type, character, text };
}

function panel(width: number, fields: Panel['fields'], description: string, elements: ScriptElement[]): Panel {
  return { id: uid('v'), width, fields, description, elements };
}

/** Progetto d'esempio, per vedere subito come funziona l'app. */
export function sampleProject(): Project {
  const p1: Page = {
    id: uid('t'),
    notes: 'Tavola d’apertura: atmosfera prima di tutto.',
    strips: [
      {
        id: uid('s'),
        height: 100,
        panels: [
          panel(
            100,
            { ambiente: 'EST', luogo: 'Porto, molo 7', momento: 'Notte', luce: 'Lampioni, nebbia fitta', inquadratura: 'Campo lunghissimo' },
            'Il porto di Genova inghiottito dalla nebbia. Le gru sono sagome scure, una nave cargo ormeggiata. In basso, minuscolo, il titolo.',
            [el('didascalia', 'Genova, novembre.')],
          ),
        ],
      },
    ],
  };
  const p2: Page = {
    id: uid('t'),
    notes: '',
    strips: [
      {
        id: uid('s'),
        height: 32,
        panels: [
          panel(40, { inquadratura: 'Campo lungo' }, 'Il molo deserto. In fondo, piccola, la sagoma di Marco che cammina con il bavero alzato.', [
            el('didascalia', 'Tre giorni dopo.'),
          ]),
          panel(60, { inquadratura: 'Primo piano' }, 'Marco si ferma e si guarda intorno. Il fiato si condensa nell’aria fredda.', [
            el('balloon', 'Dov’è finita? Aveva detto mezzanotte.', 'Marco'),
          ]),
        ],
      },
      {
        id: uid('s'),
        height: 36,
        panels: [
          panel(
            100,
            { luce: 'Fascio del faro, intermittente', inquadratura: 'Campo medio, controcampo' },
            'Dalla nebbia emerge Elena: cappotto rosso, una valigetta stretta al petto. Il fascio del faro la illumina a intermittenza.',
            [
              el('balloon', 'Sei in ritardo, Marco. Come sempre.', 'Elena'),
              el('balloon', 'Io? Sono qui da un’ora.', 'Marco'),
              el('pensiero', 'Non sa niente. Meglio così.', 'Elena'),
            ],
          ),
        ],
      },
      {
        id: uid('s'),
        height: 32,
        panels: [
          panel(30, { inquadratura: 'Dettaglio' }, 'Le mani di Elena aprono la valigetta. Dentro, ripiegata, una vecchia mappa del porto.', [
            el('sfx', 'CLACK'),
          ]),
          panel(30, { inquadratura: 'Primissimo piano' }, 'Marco, sconvolto, riconosce la mappa.', [
            el(
              'balloon',
              'Questa è la mappa di mio padre! Dove l’hai trovata? La polizia aveva detto che era bruciata nell’incendio del magazzino, insieme a tutto il resto.',
              'Marco',
            ),
          ]),
          panel(40, { inquadratura: 'Campo lungo, dall’alto' }, 'Alle loro spalle, sulla banchina, una figura immobile li osserva dall’ombra delle gru.', [
            el('sussurro', 'Non qui. Ci seguono.', 'Elena'),
            el('nota', 'La figura deve restare irriconoscibile: solo silhouette.'),
          ]),
        ],
      },
    ],
  };
  const p3: Page = {
    id: uid('t'),
    notes: '',
    strips: [
      {
        id: uid('s'),
        height: 50,
        panels: [
          panel(100, { ambiente: 'INT', luogo: 'Bar Ancora', luce: 'Neon verdastro, fumo', inquadratura: 'Campo medio' }, 'Un bar di porto quasi vuoto. Marco ed Elena a un tavolino in fondo, la mappa aperta tra due bicchieri.', [
            el('balloon', 'Qui siamo al sicuro. Il proprietario era amico di tuo padre.', 'Elena'),
          ]),
        ],
      },
      {
        id: uid('s'),
        height: 50,
        panels: [
          panel(50, { inquadratura: 'Primo piano' }, 'Marco studia la mappa, il dito su una croce tracciata a matita.', [
            el('balloon', 'Il faro di levante… Perché proprio lì?', 'Marco'),
          ]),
          panel(50, { inquadratura: 'Mezza figura' }, 'Elena guarda verso la porta, tesa.', [el('balloon', 'Lo scopriremo stanotte.', 'Elena')]),
        ],
      },
    ],
  };
  return {
    ...emptyProject(),
    title: 'Il porto delle nebbie',
    subtitle: 'Albo 1',
    author: '',
    logline:
      'Un ex marinaio, convinto che il padre sia morto in un incendio, riceve dalla donna che ama la mappa che il padre stava nascondendo: per scoprire la verità dovrà fidarsi di lei, mentre qualcuno li segue nella nebbia del porto.',
    soggetto:
      'Genova, novembre. Marco, trent\u2019anni, ex marinaio, vive ancora all\u2019ombra della morte del padre, scomparso nell\u2019incendio di un magazzino del porto.\nUna notte Elena, la ragazza che non vede da anni, gli dà appuntamento sul molo 7 e gli mostra una vecchia mappa del porto: è quella del padre, che tutti credevano bruciata.\nCostretti a nascondersi al Bar Ancora, i due scoprono sulla mappa una croce tracciata a matita sul faro di levante. Ma un uomo li sta seguendo, e Elena sa più di quanto dice.',
    characters: [
      { id: uid('c'), name: 'Marco', notes: 'Trent’anni, ex marinaio, cappotto scuro.' },
      { id: uid('c'), name: 'Elena', notes: 'Cappotto rosso. Sa più di quanto dice.' },
    ],
    places: [
      { id: uid('l'), name: 'Porto, molo 7' },
      { id: uid('l'), name: 'Bar Ancora' },
    ],
    pages: [p1, p2, p3],
  };
}

/** Controllo minimo di un file aperto dall'utente. */
export function parseProject(data: unknown): Project {
  if (!data || typeof data !== 'object') throw new Error('Il file non contiene un progetto valido.');
  const p = data as Partial<Project>;
  if (p.version !== 1 || !Array.isArray(p.pages)) throw new Error('Il file non è un progetto di Scomic (versione non riconosciuta).');
  const base = emptyProject();
  return {
    ...base,
    ...p,
    customSize: p.customSize ?? base.customSize,
    characters: Array.isArray(p.characters) ? p.characters : [],
    places: Array.isArray(p.places) ? p.places : [],
    pages: p.pages.length ? p.pages : base.pages,
  } as Project;
}
