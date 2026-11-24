import { resolveProject, type Resolved } from '../model/resolve';
import type { Project } from '../model/types';
import { useStore } from './store';

let lastProject: Project | null = null;
let lastResolved: Resolved | null = null;

/** Calcoli derivati (numerazione, ereditarietà, densità), ricalcolati solo se il progetto cambia. */
export function getResolved(project: Project): Resolved {
  if (project !== lastProject || !lastResolved) {
    lastProject = project;
    lastResolved = resolveProject(project);
  }
  return lastResolved;
}

export function useResolved(): Resolved {
  const project = useStore((s) => s.project);
  return getResolved(project);
}
