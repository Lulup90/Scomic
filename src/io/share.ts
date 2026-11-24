// Condivisione di un progetto con un'altra persona.
//
// Il link contiene tutto il progetto, compresso, dopo il simbolo # dell'indirizzo:
// quella parte non viene mai inviata al server, quindi il progetto passa solo
// da chi lo manda a chi lo apre. Chi ha il link può leggere tutto il progetto.
import { parseProject } from '../model/factory';
import type { Project } from '../model/types';
import { IS_ARTIFACT } from './platform';

export const PUBLIC_URL = 'https://lulup90.github.io/Scomic/';
const PREFIX = 'p=';

/** Oltre questa lunghezza alcune app di messaggi tagliano i link: meglio mandare il file. */
export const LONG_LINK = 30000;

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([data]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

/** Progetto → testo compatto da mettere nel link. "1" = compresso, "0" = non compresso. */
export async function encodeProject(project: Project): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(project));
  if (canCompress()) return '1' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
  return '0' + toBase64Url(bytes);
}

const BROKEN = 'Il link del progetto è incompleto o rovinato (a volte le app di messaggi lo tagliano). Chiedi di rimandarlo, oppure fatti mandare il file del progetto.';

export async function decodeProject(code: string): Promise<Project> {
  const kind = code[0];
  if (kind === '1' && !canCompress()) throw new Error('Questo browser è troppo vecchio per aprire il link: chiedi il file del progetto.');
  if (kind !== '0' && kind !== '1') throw new Error(BROKEN);
  try {
    let bytes = fromBase64Url(code.slice(1));
    if (kind === '1') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    return parseProject(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    throw new Error(BROKEN);
  }
}

/** Indirizzo dove aprire il link: questo sito, o quello pubblico se l'app gira altrove. */
function baseUrl(): string {
  if (IS_ARTIFACT || typeof location === 'undefined' || !location.protocol.startsWith('http')) return PUBLIC_URL;
  return location.origin + location.pathname;
}

export async function shareLink(project: Project): Promise<string> {
  return `${baseUrl()}#${PREFIX}${await encodeProject(project)}`;
}

/** Se l'app è stata aperta da un link di condivisione, restituisce il progetto ricevuto. */
export async function readIncoming(hash: string): Promise<Project | null> {
  const h = hash.replace(/^#/, '');
  if (!h.startsWith(PREFIX)) return null;
  return decodeProject(h.slice(PREFIX.length));
}

export function clearIncoming(): void {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch {
    location.hash = '';
  }
}
