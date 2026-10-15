/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { COLOR_MAP } from '../logic/geometry';
import { PuzzleColor } from '../types/puzzle';

export interface ColorPreset {
  id: string;
  name: string;
  description?: string;
  colorMap: Record<string, string>;
  stickers?: PuzzleColor[];
  mode?: '6-color' | '12-color';
  createdAt: number;
  isBuiltIn?: boolean;
}

export interface SavedPuzzleSetup {
  id: string;
  name: string;
  stickers: PuzzleColor[];
  mode: '6-color' | '12-color';
  colorMap: Record<string, string>;
  savedAt: number;
}

const STORAGE_KEYS = {
  ACTIVE_COLORMAP: 'skewb_custom_colormap_v2',
  SAVED_PUZZLE_SETUP: 'skewb_saved_setup_v2',
  AUTOSAVE_STICKERS: 'skewb_autosave_stickers_v2',
  AUTOSAVE_MODE: 'skewb_autosave_mode_v2',
  CUSTOM_PRESETS: 'skewb_custom_presets_v2',
};

// Built-in presets
export const BUILT_IN_PRESETS: ColorPreset[] = [
  {
    id: 'builtin-default',
    name: 'Modern Studio (Default)',
    description: 'Vibrant, high-legibility palette optimized for 3D PBR rendering.',
    colorMap: { ...COLOR_MAP },
    createdAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'builtin-mefferts-classic',
    name: "Meffert's Ultimate Classic",
    description: 'Authentic rich saturation inspired by original Meffert’s Skewb Ultimate releases.',
    colorMap: {
      white: '#FFFFFF',
      yellow: '#FFEB3B',
      lime: '#76FF03',
      green: '#1B5E20',
      blue: '#0D47A1',
      cyan: '#00E5FF',
      amber: '#E65100',
      orange: '#FF6D00',
      red: '#B71C1C',
      pink: '#F50057',
      purple: '#4A148C',
      silver: '#78909C',
    },
    createdAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'builtin-neon-cyber',
    name: 'High-Contrast Neon',
    description: 'Maximized color separation for easy visual tracking and fast solves.',
    colorMap: {
      white: '#FFFFFF',
      yellow: '#FFE600',
      lime: '#39FF14',
      green: '#00FF66',
      blue: '#0066FF',
      cyan: '#00F0FF',
      amber: '#FF9900',
      orange: '#FF5500',
      red: '#FF0033',
      pink: '#FF007F',
      purple: '#9900FF',
      silver: '#CBD5E1',
    },
    createdAt: 0,
    isBuiltIn: true,
  },
  {
    id: 'builtin-pastel-matte',
    name: 'Nordic Pastel & Matte',
    description: 'Soft, muted tones designed to minimize eye strain during long practice sessions.',
    colorMap: {
      white: '#F8FAFC',
      yellow: '#FEF08A',
      lime: '#BEF264',
      green: '#86EFAC',
      blue: '#93C5FD',
      cyan: '#A5F3FC',
      amber: '#FDE68A',
      orange: '#FDBA74',
      red: '#FCA5A5',
      pink: '#F472B6',
      purple: '#C084FC',
      silver: '#94A3B8',
    },
    createdAt: 0,
    isBuiltIn: true,
  },
];

// Safe localStorage helper
function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to read "${key}" from localStorage:`, err);
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to write "${key}" to localStorage:`, err);
    return false;
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[Storage] Failed to remove "${key}" from localStorage:`, err);
  }
}

/**
 * 1. Active Color Palette Persistence (Automatic)
 */
export function loadActiveColorMap(): Record<string, string> {
  const stored = safeGetItem(STORAGE_KEYS.ACTIVE_COLORMAP);
  if (!stored) return { ...COLOR_MAP };
  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      return { ...COLOR_MAP, ...parsed };
    }
  } catch (err) {
    console.warn('[Storage] Error parsing stored colorMap:', err);
  }
  return { ...COLOR_MAP };
}

export function saveActiveColorMap(colorMap: Record<string, string>): boolean {
  return safeSetItem(STORAGE_KEYS.ACTIVE_COLORMAP, JSON.stringify(colorMap));
}

export function resetActiveColorMap(): void {
  safeRemoveItem(STORAGE_KEYS.ACTIVE_COLORMAP);
}

/**
 * 2. Painted Puzzle State Auto-Save & Manual Snapshot Persistence
 */
export function loadAutosavedStickers(): {
  stickers: PuzzleColor[];
  mode: '6-color' | '12-color';
} | null {
  const storedStickers = safeGetItem(STORAGE_KEYS.AUTOSAVE_STICKERS);
  const storedMode = safeGetItem(STORAGE_KEYS.AUTOSAVE_MODE) as '6-color' | '12-color' | null;

  if (!storedStickers) return null;
  try {
    const parsed = JSON.parse(storedStickers);
    if (Array.isArray(parsed) && parsed.length === 48) {
      return {
        stickers: parsed as PuzzleColor[],
        mode: storedMode === '6-color' ? '6-color' : '12-color',
      };
    }
  } catch (err) {
    console.warn('[Storage] Error parsing autosaved stickers:', err);
  }
  return null;
}

export function saveAutosavedStickers(
  stickers: PuzzleColor[],
  mode: '6-color' | '12-color'
): boolean {
  if (!stickers || stickers.length !== 48) return false;
  safeSetItem(STORAGE_KEYS.AUTOSAVE_MODE, mode);
  return safeSetItem(STORAGE_KEYS.AUTOSAVE_STICKERS, JSON.stringify(stickers));
}

export function clearAutosavedStickers(): void {
  safeRemoveItem(STORAGE_KEYS.AUTOSAVE_STICKERS);
  safeRemoveItem(STORAGE_KEYS.AUTOSAVE_MODE);
}

/**
 * 3. Saved Physical Puzzle Snapshot ("My Physical Skewb")
 */
export function loadSavedPuzzleSetup(): SavedPuzzleSetup | null {
  const stored = safeGetItem(STORAGE_KEYS.SAVED_PUZZLE_SETUP);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (parsed && Array.isArray(parsed.stickers) && parsed.stickers.length === 48) {
      return parsed as SavedPuzzleSetup;
    }
  } catch (err) {
    console.warn('[Storage] Error parsing saved puzzle setup:', err);
  }
  return null;
}

export function savePuzzleSetup(
  stickers: PuzzleColor[],
  mode: '6-color' | '12-color',
  colorMap: Record<string, string>,
  name = 'My Physical Skewb'
): SavedPuzzleSetup {
  const setup: SavedPuzzleSetup = {
    id: `setup-${Date.now()}`,
    name,
    stickers: [...stickers],
    mode,
    colorMap: { ...colorMap },
    savedAt: Date.now(),
  };
  safeSetItem(STORAGE_KEYS.SAVED_PUZZLE_SETUP, JSON.stringify(setup));
  return setup;
}

export function clearSavedPuzzleSetup(): void {
  safeRemoveItem(STORAGE_KEYS.SAVED_PUZZLE_SETUP);
}

/**
 * 4. Custom Color Presets Manager
 */
export function loadAllPresets(): ColorPreset[] {
  const customPresets: ColorPreset[] = [];
  const stored = safeGetItem(STORAGE_KEYS.CUSTOM_PRESETS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        customPresets.push(...parsed);
      }
    } catch (err) {
      console.warn('[Storage] Error parsing custom presets:', err);
    }
  }
  return [...BUILT_IN_PRESETS, ...customPresets];
}

export function saveCustomPreset(
  name: string,
  colorMap: Record<string, string>,
  description?: string,
  stickers?: PuzzleColor[],
  mode?: '6-color' | '12-color'
): ColorPreset {
  const current = loadAllPresets().filter((p) => !p.isBuiltIn);
  const newPreset: ColorPreset = {
    id: `preset-${Date.now()}`,
    name: name.trim() || 'Custom Palette',
    description: description || `Saved on ${new Date().toLocaleDateString()}`,
    colorMap: { ...colorMap },
    stickers: stickers ? [...stickers] : undefined,
    mode,
    createdAt: Date.now(),
    isBuiltIn: false,
  };
  const updated = [newPreset, ...current];
  safeSetItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(updated));
  return newPreset;
}

export function deleteCustomPreset(id: string): boolean {
  const current = loadAllPresets().filter((p) => !p.isBuiltIn);
  const filtered = current.filter((p) => p.id !== id);
  return safeSetItem(STORAGE_KEYS.CUSTOM_PRESETS, JSON.stringify(filtered));
}

/**
 * 5. Import & Export Configuration (JSON Backup/Sharing)
 */
export function exportConfigurationJson(
  colorMap: Record<string, string>,
  stickers?: PuzzleColor[],
  mode?: '6-color' | '12-color',
  name = 'My Skewb Ultimate Profile'
): string {
  const data = {
    version: 2,
    appName: 'Skewb Ultimate 3D',
    exportedAt: new Date().toISOString(),
    name,
    colorMode: mode || '12-color',
    colorMap,
    stickers,
  };
  return JSON.stringify(data, null, 2);
}

export function importConfigurationJson(jsonText: string): {
  success: boolean;
  colorMap?: Record<string, string>;
  stickers?: PuzzleColor[];
  mode?: '6-color' | '12-color';
  name?: string;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON format' };
    }

    const result: {
      success: boolean;
      colorMap?: Record<string, string>;
      stickers?: PuzzleColor[];
      mode?: '6-color' | '12-color';
      name?: string;
    } = { success: true };

    if (parsed.colorMap && typeof parsed.colorMap === 'object') {
      result.colorMap = { ...COLOR_MAP, ...parsed.colorMap };
    }

    if (Array.isArray(parsed.stickers) && parsed.stickers.length === 48) {
      result.stickers = parsed.stickers as PuzzleColor[];
    }

    if (parsed.colorMode === '6-color' || parsed.colorMode === '12-color') {
      result.mode = parsed.colorMode;
    }

    if (typeof parsed.name === 'string') {
      result.name = parsed.name;
    }

    return result;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to parse JSON text' };
  }
}
