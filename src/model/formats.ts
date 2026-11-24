import type { FormatKey, Project } from './types';

export interface PageFormat {
  key: FormatKey;
  name: string;
  /** Dimensioni in centimetri. */
  w: number;
  h: number;
  label: string;
}

export const FORMATS: PageFormat[] = [
  { key: 'bonelli', name: 'Bonelliano', w: 16, h: 21, label: '16 × 21 cm' },
  { key: 'francese', name: 'Francese (BD)', w: 24, h: 32, label: '24 × 32 cm' },
  { key: 'a4', name: 'A4', w: 21, h: 29.7, label: '21 × 29,7 cm' },
  { key: 'us', name: 'Comic USA', w: 16.8, h: 26, label: '6,625 × 10,25 in' },
  { key: 'manga', name: 'Manga B6', w: 12.8, h: 18.2, label: '12,8 × 18,2 cm' },
  { key: 'custom', name: 'Personalizzato', w: 17, h: 24, label: 'su misura' },
];

export function pageSize(project: Project): { w: number; h: number; name: string; label: string } {
  if (project.format === 'custom') {
    const { w, h } = project.customSize;
    return { w, h, name: 'Personalizzato', label: `${fmtNum(w)} × ${fmtNum(h)} cm` };
  }
  const f = FORMATS.find((x) => x.key === project.format) ?? FORMATS[0];
  return { w: f.w, h: f.h, name: f.name, label: f.label };
}

/** Numero con al massimo un decimale e virgola italiana. */
export function fmtNum(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace('.', ',');
}
