// Tiny shared store between the 3D scene and the DOM overlay.
import { useSyncExternalStore } from "react";
import { PROJECT_PLANETS, type ProjectPlanet } from "./planets";

type State = {
  selected: string | null;
  hovered: string | null;
  /** Starts as the bundled fallback, replaced once GitHub answers. */
  planets: ProjectPlanet[];
  /** performance.now() when "destroy simulation" was pressed, else null. The
   *  3D scene and the DOM overlay both run their sequence off this one clock. */
  destroyAt: number | null;
};

let state: State = { selected: null, hovered: null, planets: PROJECT_PLANETS, destroyAt: null };
const listeners = new Set<() => void>();

export const spaceStore = {
  get: () => state,
  set: (patch: Partial<State>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSpace<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    spaceStore.subscribe,
    () => sel(state),
    () => sel(state),
  );
}
