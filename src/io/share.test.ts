import { describe, expect, it } from 'vitest';
import { sampleProject } from '../model/factory';
import { decodeProject, encodeProject, readIncoming, shareLink } from './share';

describe('condivisione', () => {
  it('il progetto passa intatto attraverso il link', async () => {
    const p = sampleProject();
    const link = await shareLink(p);
    expect(link.startsWith('https://lulup90.github.io/Scomic/#p=1')).toBe(true);
    const back = await readIncoming(new URL(link).hash);
    expect(back).toEqual(JSON.parse(JSON.stringify(p)));
  });

  it('la compressione rende il link molto più corto del progetto', async () => {
    const p = sampleProject();
    const code = await encodeProject(p);
    expect(code.length).toBeLessThan(JSON.stringify(p).length * 0.6);
    expect(/^[A-Za-z0-9_-]+$/.test(code)).toBe(true); // solo caratteri sicuri negli indirizzi
  });

  it('i caratteri accentati e speciali sopravvivono', async () => {
    const p = sampleProject();
    p.title = 'Perché è così? «Ä» & <ok> 漫画';
    expect((await decodeProject(await encodeProject(p))).title).toBe(p.title);
  });

  it('un link senza progetto non apre niente, uno rovinato dà errore', async () => {
    expect(await readIncoming('#tavola-3')).toBeNull();
    expect(await readIncoming('')).toBeNull();
    await expect(readIncoming('#p=1abc')).rejects.toThrow();
  });
});
