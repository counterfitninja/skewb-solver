/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { SkewbViewer3D } from './components/SkewbViewer3D';
import { UnfoldedNet } from './components/UnfoldedNet';
import { SolverControls } from './components/SolverControls';
import { ManualColorPicker } from './components/ManualColorPicker';
import { AlgorithmGuideModal } from './components/AlgorithmGuideModal';
import { COLOR_MAP } from './logic/geometry';
import {
  getSolvedStickers,
  applyMove,
  generateScramble,
  isSolved as checkIsSolved,
  validateStickers,
  FLAT_FACETS,
} from './logic/skewbState';
import { solveSkewb, PuzzlePreset } from './logic/skewbSolver';
import { MoveName, MoveStep, PuzzleColor } from './types/puzzle';
import { sfx } from './utils/audio';
import {
  Sparkles,
  BookOpen,
  Layers,
  Box,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Keyboard,
  Palette,
  Bookmark,
  Hash,
} from 'lucide-react';
import { HexValuePickerModal } from './components/HexValuePickerModal';
import { ColorPresetModal } from './components/ColorPresetModal';
import {
  loadActiveColorMap,
  saveActiveColorMap,
  loadAutosavedStickers,
  saveAutosavedStickers,
  loadSavedPuzzleSetup,
  savePuzzleSetup,
} from './utils/storage';

export default function App() {
  const [colorMode, setColorMode] = useState<'6-color' | '12-color'>(() => {
    return loadAutosavedStickers()?.mode || '12-color';
  });
  const [stickers, setStickers] = useState<PuzzleColor[]>(() => {
    const autosaved = loadAutosavedStickers();
    if (autosaved && autosaved.stickers.length === 48) {
      return autosaved.stickers;
    }
    return getSolvedStickers('12-color');
  });
  const [colorMap, setColorMap] = useState<Record<string, string>>(() => {
    return loadActiveColorMap();
  });
  const [moveHistory, setMoveHistory] = useState<MoveName[]>([]);

  // Presets and saved physical setup states
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [savedPhysicalSetup, setSavedPhysicalSetup] = useState(() => loadSavedPuzzleSetup());

  // 3D Animation and Display states
  const [animatingMove, setAnimatingMove] = useState<MoveName | null>(null);
  const [animDurationMs, setAnimDurationMs] = useState(260);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showFaceNumbers, setShowFaceNumbers] = useState(true);

  // Paint mode states
  const [isPaintingMode, setIsPaintingMode] = useState(false);
  const [selectedBrushColor, setSelectedBrushColor] = useState<PuzzleColor>('white');
  const [activeTab, setActiveTab] = useState<'3d' | 'both' | 'net'>('both');

  // Solver states
  const [isSolving, setIsSolving] = useState(false);
  const [solutionSteps, setSolutionSteps] = useState<MoveStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlayingSolution, setIsPlayingSolution] = useState(false);
  const [solverStatusMessage, setSolverStatusMessage] = useState<string>('');

  // Guide modal
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isKeyboardModalOpen, setIsKeyboardModalOpen] = useState(false);
  const [isHexPickerModalOpen, setIsHexPickerModalOpen] = useState(false);
  const [hoveredFlatIndex, setHoveredFlatIndex] = useState<number | null>(null);

  // Solved state check
  const isPuzzleSolved = checkIsSolved(stickers, colorMode);
  const validation = validateStickers(stickers, colorMode);

  // Audio sync
  useEffect(() => {
    sfx.enabled = soundEnabled;
  }, [soundEnabled]);

  // Auto-persist custom colorMap to localStorage whenever modified
  useEffect(() => {
    saveActiveColorMap(colorMap);
  }, [colorMap]);

  // Auto-persist painted stickers and mode to localStorage
  useEffect(() => {
    saveAutosavedStickers(stickers, colorMode);
  }, [stickers, colorMode]);

  // Save current setup as "My Physical Skewb"
  const handleSaveSetupAsMySkewb = () => {
    const setup = savePuzzleSetup(stickers, colorMode, colorMap, 'My Physical Skewb');
    setSavedPhysicalSetup(setup);
    sfx.playFanfare();
    setSolverStatusMessage('Saved current 3D stickers & colors as "My Physical Skewb"!');
  };

  // Load saved "My Physical Skewb" setup
  const handleLoadMySkewb = () => {
    const setup = savedPhysicalSetup || loadSavedPuzzleSetup();
    if (!setup) return;
    setStickers(setup.stickers);
    setColorMode(setup.mode);
    setColorMap(setup.colorMap);
    setMoveHistory([]);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlayingSolution(false);
    sfx.playClick(1.2);
    setSolverStatusMessage('Loaded your saved physical Skewb setup!');
  };

  // Load whole puzzle setup from preset or JSON import
  const handleLoadPuzzleSetup = (
    newStickers: PuzzleColor[],
    newMode: '6-color' | '12-color',
    newColorMap: Record<string, string>
  ) => {
    setStickers(newStickers);
    setColorMode(newMode);
    setColorMap(newColorMap);
    setMoveHistory([]);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlayingSolution(false);
    setSolverStatusMessage('Loaded configuration to 3D model!');
    sfx.playClick(1.2);
  };

  // Apply colorMap from preset modal
  const handleApplyColorMapFromPreset = (newColorMap: Record<string, string>, message?: string) => {
    setColorMap(newColorMap);
    if (message) {
      setSolverStatusMessage(message);
    }
  };

  // When changing color mode (6-color vs 12-color)
  const handleColorModeChange = (newMode: '6-color' | '12-color') => {
    setColorMode(newMode);
    setStickers(getSolvedStickers(newMode));
    setMoveHistory([]);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlayingSolution(false);
    setSolverStatusMessage('');
  };

  // Reset to solved state
  const handleResetToSolved = useCallback(() => {
    setStickers(getSolvedStickers(colorMode));
    setMoveHistory([]);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlayingSolution(false);
    setSolverStatusMessage('Reset to solved state');
    sfx.playClick(1.0);
  }, [colorMode]);

  const animatingMoveRef = useRef<MoveName | null>(null);

  // Complete animation handler (called from 3D viewer)
  const handleAnimationComplete = useCallback(() => {
    const move = animatingMoveRef.current;
    animatingMoveRef.current = null;
    setAnimatingMove(null);

    if (move) {
      setStickers((prev) => {
        const next = applyMove(prev, move);
        if (checkIsSolved(next, colorMode)) {
          sfx.playFanfare();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'],
          });
        }
        return next;
      });
    }
  }, [colorMode]);

  // Apply single move with animation
  const handleApplyMove = useCallback(
    (move: MoveName) => {
      if (animatingMoveRef.current) return; // Prevent move overlap during animation
      animatingMoveRef.current = move;
      setAnimatingMove(move);
      setMoveHistory((prev) => [...prev, move]);

      // Safety watchdog: ensure animation state is never permanently locked
      setTimeout(() => {
        if (animatingMoveRef.current === move) {
          handleAnimationComplete();
        }
      }, animDurationMs + 350);
    },
    [animDurationMs, handleAnimationComplete]
  );

  // Scramble puzzle
  const handleScramble = (movesCount = 14) => {
    if (animatingMove) return;
    const { newStickers, moves } = generateScramble(stickers, movesCount);
    setStickers(newStickers);
    setMoveHistory((prev) => [...prev, ...moves]);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setIsPlayingSolution(false);
    setSolverStatusMessage(`Scrambled with ${moves.length} moves: ${moves.slice(0, 6).join(' ')}...`);
    sfx.playClick(0.9);
  };

  // Undo last move
  const handleUndoMove = () => {
    if (moveHistory.length === 0 || animatingMove) return;
    const lastMove = moveHistory[moveHistory.length - 1];
    const inverse = (lastMove.includes("'") ? lastMove.replace("'", '') : `${lastMove}'`) as MoveName;
    handleApplyMove(inverse);
    setMoveHistory((prev) => prev.slice(0, -1));
  };

  // Solve puzzle calculation
  const handleSolve = () => {
    if (isPuzzleSolved) {
      setSolverStatusMessage('The puzzle is already solved!');
      return;
    }
    setIsSolving(true);
    setSolverStatusMessage('Calculating optimal step-by-step solution for your Skewb...');

    // Async timeout to allow UI update before calculation
    setTimeout(() => {
      const result = solveSkewb(stickers, colorMode);
      setIsSolving(false);
      if (result.solved && result.steps.length > 0) {
        setSolutionSteps(result.steps);
        setCurrentStepIndex(0);
        setSolverStatusMessage(result.message);
        sfx.playClick(1.2);
      } else {
        setSolutionSteps([]);
        setCurrentStepIndex(0);
        setSolverStatusMessage(result.message);
        sfx.playClick(0.6);
      }
    }, 40);
  };

  // Play / Pause solution auto-play
  const handleTogglePlaySolution = () => {
    setIsPlayingSolution((prev) => !prev);
  };

  // Step Forward in solution
  const handleStepForward = useCallback(() => {
    if (currentStepIndex >= solutionSteps.length || animatingMove) return;
    const step = solutionSteps[currentStepIndex];
    if (step) {
      handleApplyMove(step.move);
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex, solutionSteps, animatingMove, handleApplyMove]);

  // Step Backward in solution
  const handleStepBackward = useCallback(() => {
    if (currentStepIndex <= 0 || animatingMove) return;
    const prevStep = solutionSteps[currentStepIndex - 1];
    if (prevStep) {
      const inverse = (prevStep.move.includes("'")
        ? prevStep.move.replace("'", '')
        : `${prevStep.move}'`) as MoveName;
      handleApplyMove(inverse);
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex, solutionSteps, animatingMove, handleApplyMove]);

  // Jump to specific step in solution
  const handleJumpToStep = (targetIdx: number) => {
    if (animatingMove) return;
    setIsPlayingSolution(false);
    if (targetIdx > currentStepIndex) {
      // Apply forward moves
      let cur = stickers;
      for (let i = currentStepIndex; i < targetIdx; i++) {
        cur = applyMove(cur, solutionSteps[i].move);
      }
      setStickers(cur);
      setCurrentStepIndex(targetIdx);
      sfx.playClick(1.0);
    } else if (targetIdx < currentStepIndex) {
      // Revert moves
      let cur = stickers;
      for (let i = currentStepIndex - 1; i >= targetIdx; i--) {
        const m = solutionSteps[i].move;
        const inv = (m.includes("'") ? m.replace("'", '') : `${m}'`) as MoveName;
        cur = applyMove(cur, inv);
      }
      setStickers(cur);
      setCurrentStepIndex(targetIdx);
      sfx.playClick(1.0);
    }
  };

  // Auto-play solution timer
  useEffect(() => {
    if (!isPlayingSolution) return;
    if (currentStepIndex >= solutionSteps.length) {
      setIsPlayingSolution(false);
      return;
    }

    const timer = setTimeout(() => {
      handleStepForward();
    }, animDurationMs + 80);

    return () => clearTimeout(timer);
  }, [isPlayingSolution, currentStepIndex, solutionSteps, animDurationMs, handleStepForward]);

  // Paint sticker click handler
  const handleFacetClick = (flatIndex: number) => {
    if (!isPaintingMode) return;
    setStickers((prev) => {
      const next = [...prev];
      next[flatIndex] = selectedBrushColor;
      return next;
    });
    setSolutionSteps([]);
  };

  // Change brush color and lock it in (transforms all matching stickers on the 3D model)
  const handleLockInColor = (
    oldColor: PuzzleColor,
    newColor: PuzzleColor,
    customHex?: string
  ) => {
    // 1. Update colorMap if custom hex provided or updating existing shade
    if (customHex) {
      setColorMap((prev) => ({
        ...prev,
        [newColor]: customHex,
        ...(oldColor === newColor ? { [oldColor]: customHex } : {}),
      }));
    }

    // 2. Change all matching stickers on 3D model
    let count = 0;
    setStickers((prev) =>
      prev.map((c) => {
        if (c === oldColor) {
          count++;
          return newColor;
        }
        return c;
      })
    );

    // 3. Update brush color to the newly locked color
    setSelectedBrushColor(newColor);
    setSolutionSteps([]);
    setCurrentStepIndex(0);

    const message =
      customHex && oldColor === newColor
        ? `Locked in shade for ${newColor} (${customHex}) on all matching 3D model stickers.`
        : `Locked in! Changed all ${oldColor} stickers to ${newColor} on the 3D model.`;
    setSolverStatusMessage(message);
    sfx.playClick(1.2);
  };

  // Reset custom shades back to standard COLOR_MAP
  const handleResetColorMap = () => {
    setColorMap({ ...COLOR_MAP });
    setSolverStatusMessage('Reset color palette shades to defaults.');
    sfx.playClick(1.0);
  };

  // Preset algorithm execution
  const handleApplyPreset = (preset: PuzzlePreset) => {
    let cur = stickers;
    for (const m of preset.moves) {
      cur = applyMove(cur, m);
    }
    setStickers(cur);
    setMoveHistory((prev) => [...prev, ...preset.moves]);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    setSolverStatusMessage(`Applied preset: ${preset.name}`);
    sfx.playClick(1.1);
  };

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      const key = e.key.toUpperCase();
      const shift = e.shiftKey;

      if (['U', 'L', 'R', 'B'].includes(key)) {
        e.preventDefault();
        const move = (shift ? `${key}'` : key) as MoveName;
        handleApplyMove(move);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (solutionSteps.length > 0) {
          handleTogglePlaySolution();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepBackward();
      } else if (key === 'S' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleScramble(14);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSolve();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleApplyMove, handleStepForward, handleStepBackward, solutionSteps]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. Header (Follows Strict Top Bar Contract: 3 zones separated by gap-8) */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-30">
        {/* Zone 1: Brand wordmark (single text element) */}
        <a href="/" className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2">
          <span>Skewb Ultimate 3D</span>
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
          <button
            onClick={() => setIsPresetModalOpen(true)}
            className="text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 font-semibold"
            title="Manage saved color schemes, physical skewb setup, and presets"
          >
            <Bookmark className="w-4 h-4 text-emerald-400" />
            <span>Saved Colors & Presets</span>
          </button>
          <button
            onClick={() => setIsHexPickerModalOpen(true)}
            className="text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 font-semibold"
          >
            <Palette className="w-4 h-4 text-amber-400" />
            <span>Hex Color Picker</span>
          </button>
          <button
            onClick={() => setIsGuideOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Guide & Presets</span>
          </button>
          <button
            onClick={() => setIsKeyboardModalOpen(true)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Keyboard className="w-4 h-4 text-slate-400" />
            <span>Shortcuts</span>
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'both' ? '3d' : 'both')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>{activeTab === 'both' ? 'Hide 2D Net' : 'Show 2D Net'}</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleSolve}
            disabled={isSolving || isPuzzleSolved}
            className={`px-4 py-2 text-xs font-semibold rounded-lg shadow-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              isPuzzleSolved
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 active:scale-95'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isPuzzleSolved ? 'Puzzle Solved' : isSolving ? 'Solving...' : 'Solve Now'}</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Status Notification Banner (if any message or solved) */}
        {solverStatusMessage && (() => {
          const isWarning =
            solverStatusMessage.toLowerCase().includes('unable') ||
            solverStatusMessage.toLowerCase().includes('mismatch') ||
            solverStatusMessage.toLowerCase().includes('duplicate') ||
            solverStatusMessage.toLowerCase().includes('invalid') ||
            solverStatusMessage.toLowerCase().includes('error');

          return (
            <div
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs border transition-all ${
                isWarning
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
                <span>{solverStatusMessage}</span>
              </div>
              <button
                onClick={() => setSolverStatusMessage('')}
                className="text-slate-500 hover:text-slate-300 text-xs px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
              >
                Dismiss
              </button>
            </div>
          );
        })()}

        {/* Two-Column Core Layout (3D Viewport on Left/Top, Solver & Controls on Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Interactive 3D Dodecahedron Viewer (span 7 on desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="w-full h-[480px] lg:h-[620px]">
              <SkewbViewer3D
                stickers={stickers}
                selectedColor={selectedBrushColor}
                isPaintingMode={isPaintingMode}
                onFacetClick={handleFacetClick}
                onApplyMove={handleApplyMove}
                hoveredFlatIndex={hoveredFlatIndex}
                onHoverFacet={setHoveredFlatIndex}
                animatingMove={animatingMove}
                animationProgress={0}
                onMoveComplete={handleAnimationComplete}
                animDurationMs={animDurationMs}
                colorMap={colorMap}
                showFaceNumbers={showFaceNumbers}
                onToggleFaceNumbers={() => setShowFaceNumbers((prev) => !prev)}
              />
            </div>

            {/* Quick Viewport Helper Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1 font-mono">
              <div className="flex items-center gap-3">
                <span>Moves: {moveHistory.length}</span>
                <span>·</span>
                <span className="text-indigo-400 font-semibold">{colorMode === '6-color' ? '6 Colors' : '12 Colors'}</span>
                <span>·</span>
                <button
                  onClick={() => setShowFaceNumbers((prev) => !prev)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-all ${
                    showFaceNumbers
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Toggle Face Numbers (1–12) on 3D Model"
                >
                  <Hash className="w-3 h-3" />
                  <span>Face #1–12 {showFaceNumbers ? 'ON' : 'OFF'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">U</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">L</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">R</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px]">B</kbd>
                <span className="text-[11px] text-slate-500">keys to twist</span>
              </div>
            </div>
          </div>

          {/* Right Column: Controls, Playback & Color Mode Panel (span 5 on desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Mode Switch Tabs: Play & Twist vs Brush & Color Palette */}
            <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-semibold">
              <button
                onClick={() => setIsPaintingMode(false)}
                className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  !isPaintingMode
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Box className="w-4 h-4" />
                <span>Twist & Solve Mode</span>
              </button>
              <button
                onClick={() => setIsPaintingMode(true)}
                className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  isPaintingMode
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Brush & Color Palette</span>
              </button>
            </div>

            {/* Painting mode palette if active */}
            {isPaintingMode ? (
              <ManualColorPicker
                mode={colorMode}
                onChangeMode={handleColorModeChange}
                selectedColor={selectedBrushColor}
                onSelectColor={setSelectedBrushColor}
                stickerCounts={validation.counts}
                validationMessage={validation.message}
                isValidDistribution={validation.valid}
                onFillSolved={handleResetToSolved}
                colorMap={colorMap}
                onLockInColor={handleLockInColor}
                onResetColorMap={handleResetColorMap}
                onOpenPresetModal={() => setIsPresetModalOpen(true)}
                hasSavedSetup={!!savedPhysicalSetup}
                onSaveSetupAsMySkewb={handleSaveSetupAsMySkewb}
                onLoadMySkewb={handleLoadMySkewb}
              />
            ) : null}

            {/* Solver & Move Controls */}
            <SolverControls
              onApplyMove={handleApplyMove}
              onScramble={handleScramble}
              onReset={handleResetToSolved}
              onSolve={handleSolve}
              isSolving={isSolving}
              isSolved={isPuzzleSolved}
              solutionSteps={solutionSteps}
              currentStepIndex={currentStepIndex}
              isPlayingSolution={isPlayingSolution}
              onTogglePlaySolution={handleTogglePlaySolution}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              onJumpToStep={handleJumpToStep}
              animDurationMs={animDurationMs}
              onChangeSpeed={setAnimDurationMs}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              isPaintingMode={isPaintingMode}
              onTogglePaintingMode={() => setIsPaintingMode(!isPaintingMode)}
              moveHistory={moveHistory}
              onUndoMove={handleUndoMove}
            />
          </div>
        </div>

        {/* 3. 2D Unfolded Surface Net Section */}
        {(activeTab === 'both' || activeTab === 'net') && (
          <section className="w-full pt-2">
            <UnfoldedNet
              stickers={stickers}
              selectedColor={selectedBrushColor}
              isPaintingMode={isPaintingMode}
              onFacetClick={handleFacetClick}
              hoveredFlatIndex={hoveredFlatIndex}
              onHoverFacet={setHoveredFlatIndex}
              mode={colorMode}
              colorMap={colorMap}
            />
          </section>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="w-full border-t border-slate-800/80 mt-12 py-6 px-6 bg-slate-950 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span>Meffert's Skewb Ultimate Solver · 3D Dodecahedron Twisty Puzzle Engine</span>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="hover:text-slate-300 transition-colors"
          >
            Algorithm Guide
          </button>
          <button
            onClick={() => setIsKeyboardModalOpen(true)}
            className="hover:text-slate-300 transition-colors"
          >
            Keyboard Shortcuts
          </button>
          <button
            onClick={handleResetToSolved}
            className="hover:text-slate-300 transition-colors"
          >
            Reset
          </button>
        </div>
      </footer>

      {/* Algorithm & Presets Modal */}
      <AlgorithmGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onApplyPreset={handleApplyPreset}
      />

      {/* Keyboard Shortcuts Modal */}
      {isKeyboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-indigo-400" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setIsKeyboardModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Clockwise Corner Twists</span>
                <div className="flex gap-1 font-mono">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">U</kbd>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">L</kbd>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">R</kbd>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">B</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Counter-Clockwise Twists</span>
                <div className="flex gap-1 font-mono text-[11px]">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Shift + U / L / R / B</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Play / Pause Solution</span>
                <kbd className="px-2 py-0.5 bg-slate-800 font-mono rounded">Space</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Step Forward / Backward</span>
                <div className="flex gap-1 font-mono">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">←</kbd>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">→</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-300">Instant Scramble</span>
                <kbd className="px-2 py-0.5 bg-slate-800 font-mono rounded">S</kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Trigger Solver</span>
                <kbd className="px-2 py-0.5 bg-slate-800 font-mono rounded">Enter</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hex Value Color Picker Modal */}
      <HexValuePickerModal
        isOpen={isHexPickerModalOpen}
        onClose={() => setIsHexPickerModalOpen(false)}
        mode={colorMode}
        currentColor={selectedBrushColor}
        onSelectBrushColor={(color) => {
          setSelectedBrushColor(color);
          setIsPaintingMode(true);
        }}
        onLockInColor={handleLockInColor}
        currentColorMap={colorMap}
        onResetColorMap={handleResetColorMap}
      />

      {/* Color Memory & Presets Modal */}
      <ColorPresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        currentColorMap={colorMap}
        onApplyColorMap={handleApplyColorMapFromPreset}
        currentStickers={stickers}
        currentMode={colorMode}
        onLoadPuzzleSetup={handleLoadPuzzleSetup}
      />
    </div>
  );
}
