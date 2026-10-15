/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Bookmark,
  Check,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Layers,
  Copy,
  CheckCheck,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  ColorPreset,
  SavedPuzzleSetup,
  loadAllPresets,
  saveCustomPreset,
  deleteCustomPreset,
  loadSavedPuzzleSetup,
  savePuzzleSetup,
  clearSavedPuzzleSetup,
  exportConfigurationJson,
  importConfigurationJson,
} from '../utils/storage';
import { PuzzleColor } from '../types/puzzle';
import { sfx } from '../utils/audio';

interface ColorPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColorMap: Record<string, string>;
  onApplyColorMap: (colorMap: Record<string, string>, message?: string) => void;
  currentStickers: PuzzleColor[];
  currentMode: '6-color' | '12-color';
  onLoadPuzzleSetup: (stickers: PuzzleColor[], mode: '6-color' | '12-color', colorMap: Record<string, string>) => void;
}

export const ColorPresetModal: React.FC<ColorPresetModalProps> = ({
  isOpen,
  onClose,
  currentColorMap,
  onApplyColorMap,
  currentStickers,
  currentMode,
  onLoadPuzzleSetup,
}) => {
  const [presets, setPresets] = useState<ColorPreset[]>([]);
  const [savedSetup, setSavedSetup] = useState<SavedPuzzleSetup | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Refresh presets and saved setup whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPresets(loadAllPresets());
      setSavedSetup(loadSavedPuzzleSetup());
      setFeedbackMessage(null);
      setImportError(null);
      setIsExporting(false);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Flash temporary feedback
  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3500);
  };

  // 1. Apply a preset
  const handleApplyPreset = (preset: ColorPreset) => {
    onApplyColorMap(preset.colorMap, `Applied "${preset.name}" palette!`);
    sfx.playClick(1.2);
    showFeedback(`Palette updated to "${preset.name}". Automatically saved!`);
  };

  // 2. Save current colorMap as a new preset
  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPresetName.trim();
    if (!name) return;

    const created = saveCustomPreset(name, currentColorMap);
    setPresets(loadAllPresets());
    setNewPresetName('');
    sfx.playClick(1.3);
    showFeedback(`Saved custom preset "${created.name}"!`);
  };

  // 3. Delete a custom preset
  const handleDeletePreset = (id: string, name: string) => {
    deleteCustomPreset(id);
    setPresets(loadAllPresets());
    sfx.playClick(0.8);
    showFeedback(`Deleted preset "${name}".`);
  };

  // 4. Save entire physical puzzle setup snapshot
  const handleSnapshotSetup = () => {
    const setup = savePuzzleSetup(currentStickers, currentMode, currentColorMap, 'My Physical Skewb');
    setSavedSetup(setup);
    sfx.playFanfare();
    showFeedback('Saved current 3D stickers & colors as "My Physical Skewb"!');
  };

  // 5. Load saved physical puzzle setup
  const handleRestoreSetup = () => {
    if (!savedSetup) return;
    onLoadPuzzleSetup(savedSetup.stickers, savedSetup.mode, savedSetup.colorMap);
    sfx.playClick(1.3);
    showFeedback('Restored your saved Skewb setup to the 3D model!');
    onClose();
  };

  // 6. Clear saved physical puzzle setup
  const handleClearSetup = () => {
    clearSavedPuzzleSetup();
    setSavedSetup(null);
    sfx.playClick(0.8);
    showFeedback('Cleared saved Skewb setup.');
  };

  // 7. Copy JSON profile to clipboard
  const handleCopyJson = () => {
    const json = exportConfigurationJson(currentColorMap, currentStickers, currentMode);
    navigator.clipboard.writeText(json);
    setCopied(true);
    sfx.playClick(1.1);
    setTimeout(() => setCopied(false), 2500);
  };

  // 8. Download JSON file
  const handleDownloadJson = () => {
    const json = exportConfigurationJson(currentColorMap, currentStickers, currentMode);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skewb-ultimate-colors-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sfx.playClick(1.1);
    showFeedback('Exported profile downloaded!');
  };

  // 9. Import JSON text
  const handleImportJson = () => {
    setImportError(null);
    if (!jsonInput.trim()) {
      setImportError('Please paste JSON profile data first.');
      return;
    }

    const res = importConfigurationJson(jsonInput);
    if (!res.success) {
      setImportError(res.error || 'Failed to import JSON profile');
      return;
    }

    if (res.colorMap) {
      onApplyColorMap(res.colorMap, 'Imported color palette!');
    }
    if (res.stickers && res.mode) {
      onLoadPuzzleSetup(res.stickers, res.mode, res.colorMap || currentColorMap);
    }

    sfx.playFanfare();
    showFeedback('Profile successfully imported and applied!');
    setJsonInput('');
    setIsExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Color Memory & Presets</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Auto-Saved
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Your custom colors and puzzle setups are stored locally so you don't have to reload them.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Bar */}
        {feedbackMessage && (
          <div className="px-6 py-2.5 bg-emerald-950/40 border-b border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* SECTION 1: "My Physical Skewb" Snapshot (The user's own physical puzzle) */}
          <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950/70 to-slate-950/70 border border-indigo-900/50 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  My Physical Skewb Snapshot
                </h4>
              </div>
              {savedSetup && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>
                    Saved {new Date(savedSetup.savedAt).toLocaleDateString()} {new Date(savedSetup.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Save the exact 48 stickers and custom shades of your physical Skewb. You can restore it anytime in 1 click even after scrambling or testing moves.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleSnapshotSetup}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save Current 3D Setup as "My Skewb"
              </button>

              {savedSetup && (
                <>
                  <button
                    onClick={handleRestoreSetup}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Load "My Physical Skewb"
                  </button>
                  <button
                    onClick={handleClearSetup}
                    className="px-2.5 py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl text-xs transition-colors"
                    title="Delete saved snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* SECTION 2: Palette Presets (Built-in & Custom) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Palette Presets & Schemes
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                {presets.length} Presets Available
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => {
                const colors = Object.values(preset.colorMap);
                return (
                  <div
                    key={preset.id}
                    className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">
                            {preset.name}
                          </span>
                          {preset.isBuiltIn && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              Built-in
                            </span>
                          )}
                        </div>
                        {preset.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {preset.description}
                          </p>
                        )}
                      </div>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all rounded hover:bg-rose-950/40"
                          title="Delete custom preset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Color Swatches Strip */}
                    <div className="flex items-center gap-1 overflow-hidden py-1">
                      {colors.slice(0, 12).map((hex, i) => (
                        <div
                          key={`${preset.id}-col-${i}`}
                          className="h-4 flex-1 rounded-sm border border-white/10 shrink-0"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
                      Apply Palette
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Create Custom Preset Form */}
            <form
              onSubmit={handleCreatePreset}
              className="flex items-center gap-2 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl mt-3"
            >
              <input
                type="text"
                placeholder="Name your current palette (e.g. My Skewb Colors)..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
              <button
                type="submit"
                disabled={!newPresetName.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow transition-all whitespace-nowrap flex items-center gap-1.5 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Current Palette
              </button>
            </form>
          </div>

          {/* SECTION 3: JSON Backup / Export / Import */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Backup & Share (JSON)
              </h4>
              <button
                onClick={() => setIsExporting((prev) => !prev)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                {isExporting ? 'Hide Backup Tools' : 'Export / Import Tools'}
              </button>
            </div>

            {isExporting && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy JSON to Clipboard'}
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Profile File (.json)
                  </button>
                </div>

                {/* Import Box */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Paste Profile JSON to Import:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Paste previously copied or downloaded JSON configuration here..."
                    value={jsonInput}
                    onChange={(e) => {
                      setJsonInput(e.target.value);
                      setImportError(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  {importError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{importError}</span>
                    </div>
                  )}
                  <button
                    onClick={handleImportJson}
                    disabled={!jsonInput.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow transition-all flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import & Apply Configuration
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            All modifications stay saved in your browser storage automatically.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
