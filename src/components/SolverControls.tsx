/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MoveName, MoveStep } from '../types/puzzle';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Shuffle,
  Sparkles,
  Zap,
  ArrowRight,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface SolverControlsProps {
  onApplyMove: (move: MoveName) => void;
  onScramble: (movesCount?: number) => void;
  onReset: () => void;
  onSolve: () => void;
  isSolving: boolean;
  isSolved: boolean;
  solutionSteps: MoveStep[];
  currentStepIndex: number;
  isPlayingSolution: boolean;
  onTogglePlaySolution: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onJumpToStep: (index: number) => void;
  animDurationMs: number;
  onChangeSpeed: (ms: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isPaintingMode: boolean;
  onTogglePaintingMode: () => void;
  moveHistory: MoveName[];
  onUndoMove: () => void;
}

export const SolverControls: React.FC<SolverControlsProps> = ({
  onApplyMove,
  onScramble,
  onReset,
  onSolve,
  isSolving,
  isSolved,
  solutionSteps,
  currentStepIndex,
  isPlayingSolution,
  onTogglePlaySolution,
  onStepForward,
  onStepBackward,
  onJumpToStep,
  animDurationMs,
  onChangeSpeed,
  soundEnabled,
  onToggleSound,
  isPaintingMode,
  onTogglePaintingMode,
  moveHistory,
  onUndoMove,
}) => {
  const currentStep = solutionSteps[currentStepIndex];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Primary Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          {/* Solve Button */}
          <button
            onClick={onSolve}
            disabled={isSolving || isSolved}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg transition-all ${
              isSolved
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 active:scale-95'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {isSolved ? 'Solved State' : isSolving ? 'Calculating...' : 'Solve Puzzle'}
          </button>

          {/* Scramble Button */}
          <button
            onClick={() => onScramble(14)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 rounded-xl font-medium text-sm flex items-center gap-2 transition-all active:scale-95"
          >
            <Shuffle className="w-4 h-4 text-slate-400" />
            Scramble
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/70 rounded-xl transition-all"
            title="Reset to Solved"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Audio and Edit Mode Switches */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePaintingMode}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isPaintingMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {isPaintingMode ? 'Exit Paint Mode' : 'Paint Stickers'}
          </button>

          <button
            onClick={onToggleSound}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/70 rounded-xl transition-all"
            title={soundEnabled ? 'Mute Audio' : 'Enable Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Solution Playback Panel (Shown when a solution exists) */}
      {solutionSteps.length > 0 && (
        <div className="p-5 bg-gradient-to-br from-indigo-950/40 via-slate-900/90 to-slate-900/90 border border-indigo-900/50 rounded-2xl shadow-xl flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-300">
                {currentStep ? currentStep.phase : 'Step By Step Solution'}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-400 tabular-nums">
              Step {currentStepIndex + 1} of {solutionSteps.length}
            </div>
          </div>

          {/* Current Step Description Card */}
          {currentStep && (
            <div className="flex items-start gap-4 p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <div className="px-3.5 py-2 bg-indigo-600 text-white font-mono font-bold text-xl rounded-lg shadow-md shrink-0">
                {currentStep.move}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 leading-relaxed font-medium">
                  {currentStep.explanation}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <span>Phase: {currentStep.phase}</span>
                </div>
              </div>
            </div>
          )}

          {/* Playback Controls & Scrubber */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onStepBackward}
                disabled={currentStepIndex <= 0}
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
                title="Previous Move"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={onTogglePlaySolution}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                {isPlayingSolution ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlayingSolution ? 'Pause' : 'Play Solve'}
              </button>

              <button
                onClick={onStepForward}
                disabled={currentStepIndex >= solutionSteps.length - 1}
                className="p-2 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors"
                title="Next Move"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Playback Speed Segmented Switch */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-lg text-xs">
              <span className="text-[11px] text-slate-400 px-2 font-mono">Speed:</span>
              <button
                onClick={() => onChangeSpeed(500)}
                className={`px-2 py-1 rounded transition-colors ${animDurationMs >= 450 ? 'bg-indigo-600/40 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                0.5x
              </button>
              <button
                onClick={() => onChangeSpeed(260)}
                className={`px-2 py-1 rounded transition-colors ${animDurationMs >= 200 && animDurationMs < 450 ? 'bg-indigo-600/40 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                1x
              </button>
              <button
                onClick={() => onChangeSpeed(120)}
                className={`px-2 py-1 rounded transition-colors ${animDurationMs < 200 ? 'bg-indigo-600/40 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
              >
                2x
              </button>
            </div>
          </div>

          {/* Move Sequence Breadcrumb Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-thin">
            {solutionSteps.map((step, idx) => (
              <button
                key={idx}
                onClick={() => onJumpToStep(idx)}
                className={`px-2.5 py-1 rounded-md shrink-0 transition-colors ${
                  idx === currentStepIndex
                    ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400/50'
                    : idx < currentStepIndex
                    ? 'bg-slate-800/90 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-950/70 text-slate-500 hover:text-slate-300'
                }`}
              >
                {step.move}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Move Buttons Grid */}
      <div className="p-4 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Manual Corner Twists (Skewb Notation)</span>
          {moveHistory.length > 0 && (
            <button
              onClick={onUndoMove}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Undo last ({moveHistory[moveHistory.length - 1]})
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {/* U Moves */}
          <div className="flex flex-col gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 text-center font-mono">Top (U)</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => onApplyMove('U')}
                className="flex-1 py-2 bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                U
              </button>
              <button
                onClick={() => onApplyMove("U'")}
                className="flex-1 py-2 bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                U'
              </button>
            </div>
          </div>

          {/* L Moves */}
          <div className="flex flex-col gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 text-center font-mono">Left (L)</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => onApplyMove('L')}
                className="flex-1 py-2 bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                L
              </button>
              <button
                onClick={() => onApplyMove("L'")}
                className="flex-1 py-2 bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                L'
              </button>
            </div>
          </div>

          {/* R Moves */}
          <div className="flex flex-col gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 text-center font-mono">Right (R)</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => onApplyMove('R')}
                className="flex-1 py-2 bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                R
              </button>
              <button
                onClick={() => onApplyMove("R'")}
                className="flex-1 py-2 bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                R'
              </button>
            </div>
          </div>

          {/* B Moves */}
          <div className="flex flex-col gap-1.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 text-center font-mono">Back (B)</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => onApplyMove('B')}
                className="flex-1 py-2 bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                B
              </button>
              <button
                onClick={() => onApplyMove("B'")}
                className="flex-1 py-2 bg-slate-800 hover:bg-indigo-600 text-white font-mono font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                B'
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
