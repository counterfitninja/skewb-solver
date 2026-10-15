/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PUZZLE_PRESETS, PuzzlePreset } from '../logic/skewbSolver';
import { MoveName } from '../types/puzzle';
import { X, BookOpen, Sparkles, Play, HelpCircle } from 'lucide-react';

interface AlgorithmGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: PuzzlePreset) => void;
}

export const AlgorithmGuideModal: React.FC<AlgorithmGuideModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[88vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Meffert's Skewb Ultimate Guide</h2>
              <p className="text-xs text-slate-400">
                Mathematics, solving algorithms, and piece mechanics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm leading-relaxed scrollbar-thin">
          {/* Section 1: The Geometry */}
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              1. Geometry & Piece Anatomy
            </h3>
            <p className="mb-3 text-slate-300">
              The <strong>Meffert's Skewb Ultimate</strong> is a dodecahedral (12-sided) twisty puzzle.
              Internally, its mechanism is identical to the classic cubic Skewb: deep cuts bisect the puzzle
              along four space diagonals.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs font-mono">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-indigo-400 font-bold block mb-1">8 Triangular Corners</span>
                Correspond to the 8 vertices of an embedded cube. Each corner has 3 facets on 3 adjacent pentagons.
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-indigo-400 font-bold block mb-1">6 Roof / Center Ridges</span>
                Correspond to the 6 square faces of the cube. Each ridge piece has 4 facets meeting along a central crest.
              </div>
            </div>
          </div>

          {/* Section 2: Why it's more challenging than a standard Skewb */}
          <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800/80">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              2. Why is the Skewb Ultimate Harder?
            </h3>
            <p className="text-slate-300">
              On a regular Skewb, the 6 center pieces are solid monochromatic squares, so their rotational
              orientation is invisible.
            </p>
            <p className="mt-2 text-slate-300">
              On the <strong>Skewb Ultimate</strong>, each center piece spans across two adjacent pentagons!
              This means a center piece can be in the correct position, but <em>flipped 180° upside down</em>.
              This increases the total number of distinct legal positions to <strong>100,776,960</strong>!
              Despite this complexity, mathematician Thanh Vinh Nguyen proved that any scrambled state can be
              solved in <strong>14 moves or fewer</strong>.
            </p>
          </div>

          {/* Section 3: Algorithm Library */}
          <div>
            <h3 className="text-base font-semibold text-white mb-3">
              Essential Algorithms & Presets
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {PUZZLE_PRESETS.map((preset) => (
                <div
                  key={preset.name}
                  className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{preset.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({preset.moves.length} moves)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{preset.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1 font-mono text-xs">
                      {preset.moves.map((m, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-800 text-indigo-300 rounded">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onApplyPreset(preset);
                      onClose();
                    }}
                    className="self-start sm:self-center px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Apply to Puzzle
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
