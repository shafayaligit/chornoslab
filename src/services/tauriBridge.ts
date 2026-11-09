import { HudPersistedState, createInitialSeedState } from '../types/hud';

const STORAGE_KEY = 'chronoslab_hud_state_v5';

interface TauriInternals {
  invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

function getTauriInternals(): TauriInternals | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    __TAURI_INTERNALS__?: TauriInternals;
    __TAURI__?: { core?: TauriInternals };
  };
  return w.__TAURI_INTERNALS__ ?? w.__TAURI__?.core ?? null;
}

export function isRunningInTauri(): boolean {
  return getTauriInternals() !== null;
}

export async function loadPersistedHudState(): Promise<HudPersistedState> {
  const tauri = getTauriInternals();
  if (tauri) {
    try {
      const raw = await tauri.invoke<string | null>('load_hud_state');
      if (raw) {
        return JSON.parse(raw) as HudPersistedState;
      }
    } catch {
      // Fallback to localStorage if command not registered yet
    }
  }

  try {
    const rawLocal = localStorage.getItem(STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as HudPersistedState;
      if (parsed && Array.isArray(parsed.blocks) && Array.isArray(parsed.todos)) {
        return parsed;
      }
    }
  } catch {
    // Ignore corrupt local state
  }

  const initial = createInitialSeedState();
  await savePersistedHudState(initial);
  return initial;
}

export async function savePersistedHudState(state: HudPersistedState): Promise<void> {
  const serialized = JSON.stringify(state, null, 2);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // Ignore storage quota errors
  }

  const tauri = getTauriInternals();
  if (tauri) {
    try {
      await tauri.invoke('save_hud_state', { stateJson: serialized });
    } catch {
      // Ignore in non-Tauri environment
    }
  }
}

export async function setNativeGhostMode(enabled: boolean): Promise<void> {
  const tauri = getTauriInternals();
  if (tauri) {
    try {
      await tauri.invoke('set_ghost_mode', { ghost: enabled });
    } catch {
      // Handled by UI simulation in browser mode
    }
  }
}

export async function setNativeAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  const tauri = getTauriInternals();
  if (tauri) {
    try {
      await tauri.invoke('set_always_on_top', { alwaysOnTop });
    } catch {
      // Handled by UI simulation in browser mode
    }
  }
}

export async function startNativeWindowDrag(): Promise<void> {
  const tauri = getTauriInternals();
  if (tauri) {
    try {
      await tauri.invoke('start_window_drag');
    } catch {
      // Handled by pointer drag in browser mode
    }
  }
}

export async function setNativeAutostart(enabled: boolean): Promise<void> {
  const tauri = getTauriInternals();
  if (tauri) {
    try {
      await tauri.invoke('set_autostart', { enabled });
    } catch {
      // Handled by Windows Startup folder script when running in web/preview mode
    }
  }
}

export async function centerNativeWindowTop(): Promise<void> {
  const tauri = getTauriInternals();
  if (tauri) {
    try {
      await tauri.invoke('center_window_top');
    } catch {
      // Handled by CSS flex centering in browser mode
    }
  }
}

export async function syncNativeWindowBounds(
  expanded: boolean,
  splitMode: boolean,
  floating: boolean,
  hasDrawer: boolean,
  alwaysOnTop?: boolean,
  dockEdge?: string,
  dockOffsetRatio?: number
): Promise<void> {
  const tauri = getTauriInternals();
  if (tauri) {
    try {
      await tauri.invoke('sync_window_bounds', {
        expanded,
        splitMode,
        floating,
        hasDrawer,
        alwaysOnTop: alwaysOnTop ?? true,
        dockEdge: dockEdge ?? 'top',
        dockOffsetRatio: dockOffsetRatio ?? 0.5,
      });
    } catch {
      // Handled by CSS layout in browser mode
    }
  }
}

export interface UpdateInfo {
  available: boolean;
  version?: string;
  body?: string;
  downloadAndInstall?: () => Promise<void>;
}

export async function checkForAppUpdates(): Promise<UpdateInfo> {
  if (!isRunningInTauri()) {
    return { available: false };
  }
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (update?.available) {
      return {
        available: true,
        version: update.version,
        body: update.body,
        downloadAndInstall: async () => {
          await update.downloadAndInstall();
        },
      };
    }
  } catch (err) {
    console.debug('[Tauri Updater] Check skipped or offline:', err);
  }
  return { available: false };
}
