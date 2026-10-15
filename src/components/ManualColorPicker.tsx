/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { COLOR_MAP } from '../logic/geometry';
import { PuzzleColor } from '../types/puzzle';
import {
  Paintbrush,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Lock,
  ArrowRight,
  Palette,
  RotateCcw,
  Sparkles,
  Pipette,
  Sliders,
  Bookmark,
  ShieldCheck,
  Save,
} from 'lucide-react';
import {
  HexValuePickerModal,
  normalizeHex,
  getContrastTextColor,
  hexToRgb,
} from './HexValuePickerModal';

export interface ManualColorPickerProps {
  mode: '6-color' | '12-color';
  onChangeMode: (mode: '6-color' | '12-color') => void;
  selectedColor: PuzzleColor;
  onSelectColor: (color: PuzzleColor) => void;
  stickerCounts: Record<string, number>;
  validationMessage: string;
  isValidDistribution: boolean;
  onFillSolved: () => void;
  colorMap?: Record<string, string>;
  onLockInColor: (oldColor: PuzzleColor, newColor: PuzzleColor, customHex?: string) => void;
  onResetColorMap?: () => void;
  onOpenPresetModal?: () => void;
  hasSavedSetup?: boolean;
  onSaveSetupAsMySkewb?: () => void;
  onLoadMySkewb?: () => void;
}

export const PALETTE_6_COLORS: { color: PuzzleColor; label: string }[] = [
  { color: 'white', label: 'White' },
  { color: 'yellow', label: 'Yellow' },
  { color: 'blue', label: 'Blue' },
  { color: 'green', label: 'Green' },
  { color: 'red', label: 'Red' },
  { color: 'orange', label: 'Orange' },
];

export const PALETTE_12_COLORS: { color: PuzzleColor; label: string }[] = [
  { color: 'white', label: 'White' },
  { color: 'yellow', label: 'Yellow' },
  { color: 'lime', label: 'Lime' },
  { color: 'green', label: 'Green' },
  { color: 'blue', label: 'Blue' },
  { color: 'cyan', label: 'Cyan' },
  { color: 'amber', label: 'Amber' },
  { color: 'orange', label: 'Orange' },
  { color: 'red', label: 'Red' },
  { color: 'pink', label: 'Pink' },
  { color: 'purple', label: 'Purple' },
  { color: 'silver', label: 'Silver' },
];

export const ManualColorPicker: React.FC<ManualColorPickerProps> = ({
  mode,
  onChangeMode,
  selectedColor,
  onSelectColor,
  stickerCounts,
  validationMessage,
  isValidDistribution,
  onFillSolved,
  colorMap,
  onLockInColor,
  onResetColorMap,
  onOpenPresetModal,
  hasSavedSetup,
  onSaveSetupAsMySkewb,
  onLoadMySkewb,
}) => {
  const currentPalette = mode === '6-color' ? PALETTE_6_COLORS : PALETTE_12_COLORS;
  const targetPerColor = mode === '6-color' ? 8 : 4;

  // Track previous color to allow instant inline "Lock In Replacement"
  const [previousColor, setPreviousColor] = useState<PuzzleColor | null>(null);

  // Target replacement color state for the dedicated "Change & Lock In" tool
  const [targetColor, setTargetColor] = useState<PuzzleColor>(selectedColor);
  const [customHex, setCustomHex] = useState<string>(() => {
    return (colorMap && colorMap[selectedColor]) || COLOR_MAP[selectedColor] || '#FFFFFF';
  });
  const [hexInputText, setHexInputText] = useState<string>(() => {
    const initial = (colorMap && colorMap[selectedColor]) || COLOR_MAP[selectedColor] || '#FFFFFF';
    return initial.startsWith('#') ? initial.slice(1) : initial;
  });
  const [lockSuccessMessage, setLockSuccessMessage] = useState<string>('');
  const [isHexModalOpen, setIsHexModalOpen] = useState(false);

  // Browser EyeDropper API capability
  const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  // When selectedColor changes from outside or via swatch click
  useEffect(() => {
    setTargetColor(selectedColor);
    const hex = (colorMap && colorMap[selectedColor]) || COLOR_MAP[selectedColor] || '#FFFFFF';
    setCustomHex(hex);
    setHexInputText(hex.startsWith('#') ? hex.slice(1) : hex);
  }, [selectedColor, colorMap]);

  // Handle clicking a swatch in the main grid
  const handleSwatchClick = (color: PuzzleColor) => {
    if (color !== selectedColor) {
      setPreviousColor(selectedColor);
    }
    onSelectColor(color);
  };

  // Handle target color selection in the Lock In tool
  const handleTargetColorSelect = (color: PuzzleColor) => {
    setTargetColor(color);
    const hex = (colorMap && colorMap[color]) || COLOR_MAP[color] || '#FFFFFF';
    setCustomHex(hex);
    setHexInputText(hex.startsWith('#') ? hex.slice(1) : hex);
  };

  // Handle typed hex value input
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setHexInputText(raw);
    const validated = normalizeHex(raw);
    if (validated) {
      setCustomHex(validated);
    }
  };

  // Native color picker input
  const handleNativeColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setCustomHex(val);
    setHexInputText(val.startsWith('#') ? val.slice(1) : val);
  };

  // EyeDropper screen sampler
  const handleEyeDropper = async () => {
    if (!hasEyeDropper) return;
    try {
      // @ts-expect-error - EyeDropper is experimental
      const eyeDropper = new window.EyeDropper();
      const res = await eyeDropper.open();
      if (res && res.sRGBHex) {
        const sampled = res.sRGBHex.toUpperCase();
        setCustomHex(sampled);
        setHexInputText(sampled.startsWith('#') ? sampled.slice(1) : sampled);
      }
    } catch {
      // Cancelled
    }
  };

  // Execute Lock In
  const handleExecuteLockIn = () => {
    const currentCount = stickerCounts[selectedColor] || 0;
    const finalHex = normalizeHex(customHex) || customHex;
    onLockInColor(selectedColor, targetColor, finalHex);
    setLockSuccessMessage(
      `✓ Locked in! Changed all ${currentCount} "${selectedColor}" stickers to "${targetColor}" (${finalHex}) on the 3D model.`
    );
    setPreviousColor(null);
    setTimeout(() => {
      setLockSuccessMessage('');
    }, 4000);
  };

  // Instant inline replacement from previous swatch
  const handleInlineQuickLock = () => {
    if (!previousColor) return;
    const count = stickerCounts[previousColor] || 0;
    onLockInColor(previousColor, selectedColor);
    setLockSuccessMessage(
      `✓ Locked in! Replaced all ${count} "${previousColor}" stickers with "${selectedColor}" on the 3D model.`
    );
    setPreviousColor(null);
    setTimeout(() => {
      setLockSuccessMessage('');
    }, 4000);
  };

  const currentColorHex =
    (colorMap && colorMap[selectedColor]) || COLOR_MAP[selectedColor] || '#FFFFFF';
  const targetColorHex =
    customHex || (colorMap && colorMap[targetColor]) || COLOR_MAP[targetColor] || '#FFFFFF';
  const activeStickerCount = stickerCounts[selectedColor] || 0;

  const isInputValidHex = useMemo(() => normalizeHex(hexInputText) !== null, [hexInputText]);
  const rgbValues = useMemo(() => hexToRgb(targetColorHex), [targetColorHex]);

  return (
    <div className="w-full bg-slate-900/85 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col gap-4">
      {/* Header and Edition Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">Color Palette & Brush Tool</h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Presets & Memory Manager Button */}
          {onOpenPresetModal && (
            <button
              onClick={onOpenPresetModal}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Open Presets & Memory Manager"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
              <span>Presets & Memory</span>
            </button>
          )}

          {/* Hex Value Color Picker Trigger Button */}
          <button
            onClick={() => setIsHexModalOpen(true)}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            title="Open Hex Value Color Picker modal"
          >
            <Palette className="w-3.5 h-3.5 text-amber-300" />
            <span>Hex Value Picker</span>
          </button>

          {/* Edition Mode Switch (Defaults to 12 Colors Spectrum) */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => onChangeMode('12-color')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mode === '12-color'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              12 Colors (Spectrum)
            </button>
            <button
              onClick={() => onChangeMode('6-color')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mode === '6-color'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              6 Colors (Classic)
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Saved Memory Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Colors auto-saved locally</span>
        </div>

        <div className="flex items-center gap-2">
          {onSaveSetupAsMySkewb && (
            <button
              onClick={onSaveSetupAsMySkewb}
              className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/30 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Save current 3D stickers as your physical puzzle snapshot"
            >
              <Save className="w-3 h-3 text-indigo-300" />
              <span>Save as My Skewb</span>
            </button>
          )}

          {hasSavedSetup && onLoadMySkewb && (
            <button
              onClick={onLoadMySkewb}
              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
              title="Reload your saved physical puzzle configuration"
            >
              <RotateCcw className="w-3 h-3 text-emerald-300" />
              <span>Load My Skewb</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Swatch Grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Active Brush Swatches:</span>
          <span className="text-[11px] text-slate-500 font-mono">
            Click to paint facets · Target: {targetPerColor}/color
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {currentPalette.map(({ color, label }) => {
            const count = stickerCounts[color] || 0;
            const isSelected = selectedColor === color;
            const isBalanced = count === targetPerColor;
            const hex = (colorMap && colorMap[color]) || COLOR_MAP[color] || '#ffffff';

            return (
              <button
                key={color}
                onClick={() => handleSwatchClick(color)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-left relative group ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-950/50 shadow-md ring-2 ring-indigo-400/40'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-lg shadow-sm border border-black/40 shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: hex }}
                />
                <div className="w-full flex items-center justify-between text-[11px] px-0.5 font-mono">
                  <span className="text-slate-300 font-medium truncate capitalize">{label}</span>
                  <span
                    className={`tabular-nums text-[10px] ${
                      isBalanced ? 'text-emerald-400 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {count}/{targetPerColor}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Inline Notification when user switches swatches */}
      {previousColor && previousColor !== selectedColor && (
        <div className="flex items-center justify-between gap-3 p-2.5 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-xs text-indigo-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              Changed brush: <span className="font-semibold capitalize text-white">{previousColor}</span> ➔{' '}
              <span className="font-semibold capitalize text-white">{selectedColor}</span>.
            </span>
          </div>
          <button
            onClick={handleInlineQuickLock}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow transition-all whitespace-nowrap flex items-center gap-1.5 active:scale-95"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock In on 3D Model
          </button>
        </div>
      )}

      {/* DEDICATED TOOL: Change Brush Color & Lock It In with Built-in Hex Value Picker */}
      <div className="bg-slate-950/70 border border-indigo-900/40 rounded-2xl p-4 flex flex-col gap-3.5 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Change Brush & Lock In
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {activeStickerCount} {selectedColor} stickers on 3D model
          </span>
        </div>

        {/* Live Transformation Preview */}
        <div className="flex items-center justify-between gap-2 p-3 bg-slate-900/90 rounded-xl border border-slate-800">
          {/* Current Brush Side */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg border border-white/20 shadow shrink-0"
              style={{ backgroundColor: currentColorHex }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Current</span>
              <span className="text-xs font-bold text-white capitalize truncate">
                {selectedColor}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />

          {/* Target / New Brush Side */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg border border-white/20 shadow shrink-0"
              style={{ backgroundColor: targetColorHex }}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">New Color</span>
              <span className="text-xs font-bold text-white capitalize truncate font-mono">
                {targetColor} ({targetColorHex})
              </span>
            </div>
          </div>
        </div>

        {/* Target Palette Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-slate-400 font-medium">
            Select Target Color Slot:
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {currentPalette.map(({ color, label }) => {
              const hex = (colorMap && colorMap[color]) || COLOR_MAP[color] || '#ffffff';
              const isTarget = targetColor === color;

              return (
                <button
                  key={`target-${color}`}
                  type="button"
                  onClick={() => handleTargetColorSelect(color)}
                  className={`w-6 h-6 rounded-md border transition-all ${
                    isTarget
                      ? 'ring-2 ring-indigo-400 scale-110 border-white'
                      : 'border-black/50 hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={`Change to ${label} (${hex})`}
                />
              );
            })}
          </div>
        </div>

        {/* Dedicated Hex Value Picker Input Section */}
        <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hex Value Picker:</span>
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-medium ${isInputValidHex ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isInputValidHex ? '✓ Valid Hex' : '✕ Invalid Code'}
              </span>
              {rgbValues && (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  RGB({rgbValues.r}, {rgbValues.g}, {rgbValues.b})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clickable Swatch with Native Color Wheel Trigger */}
            <label
              className="relative w-9 h-9 rounded-xl border border-white/30 shadow-md shrink-0 cursor-pointer overflow-hidden flex items-center justify-center transition-transform hover:scale-105"
              style={{ backgroundColor: targetColorHex }}
              title="Click to open color picker wheel"
            >
              <input
                type="color"
                value={targetColorHex.startsWith('#') ? targetColorHex : '#FFFFFF'}
                onChange={handleNativeColorInput}
                className="opacity-0 w-0 h-0 absolute pointer-events-none"
              />
              <span
                className="text-[9px] font-bold font-mono px-1 py-0.5 rounded"
                style={{
                  color: getContrastTextColor(targetColorHex),
                  backgroundColor: getContrastTextColor(targetColorHex) === '#000000' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                }}
              >
                HEX
              </span>
            </label>

            {/* Direct Hex Code Input Field */}
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 text-xs select-none">
                #
              </span>
              <input
                type="text"
                value={hexInputText}
                onChange={handleHexInputChange}
                placeholder="FFFFFF"
                maxLength={7}
                className={`w-full pl-6 pr-2 py-1.5 bg-slate-950 border rounded-lg font-mono text-xs font-semibold uppercase text-white focus:outline-none focus:ring-1 transition-all ${
                  isInputValidHex
                    ? 'border-indigo-500/50 focus:ring-indigo-500'
                    : 'border-rose-500/50 focus:ring-rose-500'
                }`}
                title="Enter 3 or 6 digit hex code"
              />
            </div>

            {/* Optional Screen Eyedropper */}
            {hasEyeDropper && (
              <button
                type="button"
                onClick={handleEyeDropper}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors shrink-0"
                title="Pick color from screen"
              >
                <Pipette className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Full Hex Modal Button */}
            <button
              type="button"
              onClick={() => setIsHexModalOpen(true)}
              className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-lg border border-indigo-500/40 text-xs font-medium transition-colors shrink-0 flex items-center gap-1"
              title="Open full Hex Value Picker modal"
            >
              <Sliders className="w-3 h-3" />
              <span>Full Picker</span>
            </button>
          </div>
        </div>

        {/* Lock In Execution Button */}
        <button
          onClick={handleExecuteLockIn}
          disabled={!isInputValidHex}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Lock className="w-4 h-4 text-amber-300" />
          <span>Lock In & Change All on 3D Model</span>
        </button>

        <p className="text-[11px] text-slate-400 text-center leading-tight">
          Locks in this hex value and updates all {activeStickerCount} &quot;{selectedColor}&quot; stickers on the 3D model and 2D net simultaneously.
        </p>

        {/* Success confirmation toast */}
        {lockSuccessMessage && (
          <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{lockSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* Status Alert & Quick Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs">
          {isValidDistribution ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Valid sticker counts ({targetPerColor} per color). Ready to solve!</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{validationMessage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onResetColorMap && (
            <button
              onClick={onResetColorMap}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 py-1 px-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
              title="Reset any custom color shades back to standard"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Shades
            </button>
          )}

          <button
            onClick={onFillSolved}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 py-1 px-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            Reset to Solved Colors
          </button>
        </div>
      </div>

      {/* Dedicated Hex Value Picker Modal */}
      <HexValuePickerModal
        isOpen={isHexModalOpen}
        onClose={() => setIsHexModalOpen(false)}
        mode={mode}
        currentColor={selectedColor}
        onSelectBrushColor={(color) => {
          onSelectColor(color);
          setTargetColor(color);
        }}
        onLockInColor={onLockInColor}
        currentColorMap={colorMap}
        onResetColorMap={onResetColorMap}
      />
    </div>
  );
};
