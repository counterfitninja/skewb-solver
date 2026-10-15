/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Palette,
  Check,
  Copy,
  Lock,
  Paintbrush,
  RotateCcw,
  Pipette,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';
import { PuzzleColor } from '../types/puzzle';
import { COLOR_MAP } from '../logic/geometry';
import { PALETTE_12_COLORS, PALETTE_6_COLORS } from './ManualColorPicker';

export interface HexValuePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: '6-color' | '12-color';
  currentColor: PuzzleColor;
  onSelectBrushColor: (color: PuzzleColor) => void;
  onLockInColor: (oldColor: PuzzleColor, newColor: PuzzleColor, customHex?: string) => void;
  currentColorMap?: Record<string, string>;
  onResetColorMap?: () => void;
}

// Popular curated shade presets for twisty puzzles
const PRESET_CUSTOM_PALETTES = [
  { name: 'Vibrant Neon', hex: '#39FF14', label: 'Neon Green' },
  { name: 'Electric Cyan', hex: '#00F5FF', label: 'Electric Cyan' },
  { name: 'Fluorescent Yellow', hex: '#FDF000', label: 'Fluo Yellow' },
  { name: 'Hot Magenta', hex: '#FF007F', label: 'Hot Pink' },
  { name: 'Deep Violet', hex: '#7C3AED', label: 'Deep Violet' },
  { name: 'Ruby Blaze', hex: '#EF4444', label: 'Ruby Red' },
  { name: 'Pure Tangerine', hex: '#F97316', label: 'Tangerine' },
  { name: 'Metallic Silver', hex: '#CBD5E1', label: 'Silver' },
  { name: 'Cobalt Blue', hex: '#1D4ED8', label: 'Cobalt' },
  { name: 'Solar Amber', hex: '#F59E0B', label: 'Amber' },
  { name: 'Emerald Forest', hex: '#059669', label: 'Emerald' },
  { name: 'Pure White', hex: '#FFFFFF', label: 'White' },
];

// Helper: Validate and normalize hex
export function normalizeHex(input: string): string | null {
  let cleaned = input.trim();
  if (cleaned.startsWith('#')) {
    cleaned = cleaned.slice(1);
  }
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    return null;
  }
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return '#' + cleaned.toUpperCase();
}

// Helper: Hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const norm = normalizeHex(hex);
  if (!norm) return null;
  const num = parseInt(norm.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Helper: RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Helper: Luminance for contrast
export function getContrastTextColor(hex: string): '#000000' | '#FFFFFF' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.55 ? '#000000' : '#FFFFFF';
}

export const HexValuePickerModal: React.FC<HexValuePickerModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentColor,
  onSelectBrushColor,
  onLockInColor,
  currentColorMap,
  onResetColorMap,
}) => {
  const palette = mode === '6-color' ? PALETTE_6_COLORS : PALETTE_12_COLORS;

  // Selected puzzle color slot to customize
  const [targetSlot, setTargetSlot] = useState<PuzzleColor>(currentColor);

  // Raw hex string entered by user
  const initialHex =
    (currentColorMap && currentColorMap[currentColor]) || COLOR_MAP[currentColor] || '#FFFFFF';
  const [rawHexInput, setRawHexInput] = useState<string>(initialHex);
  const [activeHex, setActiveHex] = useState<string>(initialHex);
  const [copied, setCopied] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string>('');

  // Support for browser EyeDropper API
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  // Sync when modal opens or currentColor changes
  useEffect(() => {
    if (isOpen) {
      setTargetSlot(currentColor);
      const hex =
        (currentColorMap && currentColorMap[currentColor]) || COLOR_MAP[currentColor] || '#FFFFFF';
      setRawHexInput(hex);
      setActiveHex(hex);
      setStatusFeedback('');
    }
  }, [isOpen, currentColor, currentColorMap]);

  // When user changes target puzzle slot
  const handleSlotChange = (slot: PuzzleColor) => {
    setTargetSlot(slot);
    const hex = (currentColorMap && currentColorMap[slot]) || COLOR_MAP[slot] || '#FFFFFF';
    setRawHexInput(hex);
    setActiveHex(hex);
    setStatusFeedback(`Target slot set to "${slot}".`);
  };

  // When user types in hex input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRawHexInput(val);
    const norm = normalizeHex(val);
    if (norm) {
      setActiveHex(norm);
    }
  };

  // Color picker input change
  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value.toUpperCase();
    setRawHexInput(hex);
    setActiveHex(hex);
  };

  // Quick preset click
  const handlePresetSelect = (hex: string) => {
    setRawHexInput(hex);
    setActiveHex(hex);
  };

  // EyeDropper API call
  const handlePickFromScreen = async () => {
    if (!hasEyeDropper) return;
    try {
      // @ts-expect-error - EyeDropper API is experimental
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        const hex = result.sRGBHex.toUpperCase();
        setRawHexInput(hex);
        setActiveHex(hex);
        setStatusFeedback(`Sampled ${hex} from screen.`);
      }
    } catch {
      // User cancelled eye dropper
    }
  };

  // Copy hex to clipboard
  const handleCopyHex = () => {
    navigator.clipboard.writeText(activeHex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Color metrics
  const rgb = useMemo(() => hexToRgb(activeHex) || { r: 255, g: 255, b: 255 }, [activeHex]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);
  const contrastText = useMemo(() => getContrastTextColor(activeHex), [activeHex]);
  const isValidHex = useMemo(() => normalizeHex(rawHexInput) !== null, [rawHexInput]);

  // Action: Apply as active brush color
  const handleApplyToBrush = () => {
    onSelectBrushColor(targetSlot);
    onLockInColor(targetSlot, targetSlot, activeHex);
    setStatusFeedback(`✓ Applied ${activeHex} to brush and updated "${targetSlot}" slot!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Action: Lock in and replace on 3D model
  const handleLockInTo3DModel = () => {
    onLockInColor(targetSlot, targetSlot, activeHex);
    setStatusFeedback(
      `✓ Locked in ${activeHex}! Updated all "${targetSlot}" facets on the 3D model.`
    );
    setTimeout(() => {
      onClose();
    }, 1400);
  };

  // Action: Reset current slot to default hex
  const handleResetSlot = () => {
    const defaultHex = COLOR_MAP[targetSlot];
    setRawHexInput(defaultHex);
    setActiveHex(defaultHex);
    onLockInColor(targetSlot, targetSlot, defaultHex);
    setStatusFeedback(`Reset "${targetSlot}" back to default ${defaultHex}.`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Hex Value Color Picker</h3>
              <p className="text-xs text-slate-400">
                Input precise hex values or pick shades for 3D model stickers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-5 max-h-[80vh] overflow-y-auto">
          {/* Target Puzzle Slot Selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Target Puzzle Color Slot:</span>
              <span className="text-indigo-400 capitalize font-mono text-[11px]">
                {targetSlot} ({currentColorMap?.[targetSlot] || COLOR_MAP[targetSlot]})
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
              {palette.map(({ color, label }) => {
                const hex = currentColorMap?.[color] || COLOR_MAP[color];
                const isSelected = targetSlot === color;
                return (
                  <button
                    key={`slot-${color}`}
                    type="button"
                    onClick={() => handleSlotChange(color)}
                    className={`h-7 rounded-lg border transition-all flex items-center justify-center relative group ${
                      isSelected
                        ? 'ring-2 ring-indigo-400 scale-105 border-white shadow-md'
                        : 'border-black/50 hover:scale-102 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                    title={`${label}: ${hex}`}
                  >
                    {isSelected && (
                      <Check
                        className="w-3.5 h-3.5 drop-shadow"
                        style={{ color: getContrastTextColor(hex) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Hex Input & Swatch Preview Card */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col gap-4 shadow-inner">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Large Interactive Color Swatch with EyeDropper / Click to Pick */}
              <label
                className="relative w-24 h-24 rounded-2xl border-2 border-white/20 shadow-lg shrink-0 cursor-pointer overflow-hidden flex flex-col items-center justify-center transition-transform hover:scale-102 group"
                style={{ backgroundColor: activeHex }}
                title="Click to open color picker wheel"
              >
                <input
                  type="color"
                  value={activeHex}
                  onChange={handleNativePickerChange}
                  className="opacity-0 w-0 h-0 absolute pointer-events-none"
                />
                <span
                  className="text-xs font-bold font-mono px-2 py-0.5 rounded backdrop-blur-sm shadow-sm transition-opacity group-hover:scale-110"
                  style={{
                    color: contrastText,
                    backgroundColor: contrastText === '#000000' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                  }}
                >
                  Aa
                </span>
                <span
                  className="text-[10px] font-semibold mt-1 opacity-80"
                  style={{ color: contrastText }}
                >
                  Click Picker
                </span>
              </label>

              {/* Direct Hex Input & Controls */}
              <div className="w-full flex flex-col gap-2">
                <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>Hex Color Code:</span>
                  <span className="text-[11px] text-slate-400">Accepts 3 or 6 hex digits</span>
                </label>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 select-none">
                      #
                    </span>
                    <input
                      type="text"
                      value={rawHexInput.startsWith('#') ? rawHexInput.slice(1) : rawHexInput}
                      onChange={handleHexInputChange}
                      placeholder="FF5733"
                      maxLength={7}
                      className={`w-full pl-8 pr-3 py-2 bg-slate-900 border rounded-xl font-mono text-base font-semibold tracking-wider text-white uppercase focus:outline-none focus:ring-2 transition-all ${
                        isValidHex
                          ? 'border-indigo-500/60 focus:ring-indigo-500/50'
                          : 'border-rose-500/60 focus:ring-rose-500/50'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyHex}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors flex items-center justify-center shrink-0 border border-slate-700"
                    title="Copy hex code"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  {hasEyeDropper && (
                    <button
                      type="button"
                      onClick={handlePickFromScreen}
                      className="p-2.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-xl transition-colors flex items-center justify-center shrink-0 border border-indigo-500/40"
                      title="Sample color from screen (EyeDropper)"
                    >
                      <Pipette className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Validation and color metrics */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                  <span>
                    RGB: {rgb.r}, {rgb.g}, {rgb.b}
                  </span>
                  <span>
                    HSL: {hsl.h}°, {hsl.s}%, {hsl.l}%
                  </span>
                  <span className={isValidHex ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {isValidHex ? '✓ Valid Hex' : '✕ Invalid Hex'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Presets & Shades */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Popular Custom Shades:</span>
            </span>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {PRESET_CUSTOM_PALETTES.map(({ name, hex, label }) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handlePresetSelect(hex)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    activeHex.toUpperCase() === hex.toUpperCase()
                      ? 'border-indigo-400 bg-indigo-950/40 ring-1 ring-indigo-400'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                  title={`${name} (${hex})`}
                >
                  <div
                    className="w-full h-5 rounded-md border border-black/40 shadow-sm"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-[10px] font-medium text-slate-300 truncate w-full text-center">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Status / Feedback message */}
          {statusFeedback && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-700/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{statusFeedback}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleApplyToBrush}
              disabled={!isValidHex}
              className="w-full sm:flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer active:scale-98"
            >
              <Paintbrush className="w-3.5 h-3.5 text-indigo-400" />
              <span>Apply to Brush</span>
            </button>

            <button
              type="button"
              onClick={handleLockInTo3DModel}
              disabled={!isValidHex}
              className="w-full sm:flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-98"
            >
              <Lock className="w-3.5 h-3.5 text-amber-300" />
              <span>Lock In on 3D Model</span>
            </button>
          </div>

          {/* Reset / Default option */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="text-[11px]">
              Locks in this hex code for all {targetSlot} stickers on the 3D model.
            </span>
            <button
              type="button"
              onClick={handleResetSlot}
              className="hover:text-white flex items-center gap-1 transition-colors underline decoration-slate-600 text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Slot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
