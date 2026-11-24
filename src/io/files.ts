import { parseProject } from '../model/factory';
import type { Project } from '../model/types';

/** Fa scaricare un file al browser. */
export function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Apre un file di progetto scelto dall'utente. */
export function openProjectFile(): Promise<Project> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('Nessun file scelto.'));
      try {
        const text = await file.text();
        resolve(parseProject(JSON.parse(text)));
      } catch (e) {
        reject(e instanceof Error ? e : new Error('File non leggibile.'));
      }
    };
    input.click();
  });
}
