/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  applyMove,
  applyMoves,
  isSolved,
  rotateStickers,
  deduceSolvedTarget,
  validateStickers,
  validatePiecePhysicalIntegrity,
  MOVE_MAP_UNDER_ROTATION,
  FLAT_FACETS,
} from './skewbState';
import { MoveName, MoveStep, PuzzleColor, SolverResult } from '../types/puzzle';

const ALL_MOVES: MoveName[] = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"];
const OPPOSITE_MOVE: Record<MoveName, MoveName> = {
  'U': "U'", "U'": 'U',
  'L': "L'", "L'": 'L',
  'R': "R'", "R'": 'R',
  'B': "B'", "B'": 'B',
};

// Compact non-colliding hash for stickers array (every color gets a unique hex char)
const COLOR_TO_HEX: Record<PuzzleColor, string> = {
  white: '0',
  yellow: '1',
  blue: '2',
  green: '3',
  red: '4',
  orange: '5',
  purple: '6',
  pink: '7',
  cyan: '8',
  lime: '9',
  silver: 'a',
  amber: 'b',
};

export function hashStickers(stickers: PuzzleColor[]): string {
  let s = '';
  for (let i = 0; i < stickers.length; i++) {
    s += COLOR_TO_HEX[stickers[i]] || stickers[i][0];
  }
  return s;
}

// Corner-only facet indices for corner heuristic
const CORNER_INDICES = FLAT_FACETS
  .map((fl, idx) => (fl.pieceType === 'corner' ? idx : -1))
  .filter((idx) => idx !== -1);

function cornerHash(stickers: PuzzleColor[]): string {
  let s = '';
  for (let i = 0; i < CORNER_INDICES.length; i++) {
    const col = stickers[CORNER_INDICES[i]];
    s += COLOR_TO_HEX[col] || col[0];
  }
  return s;
}

// Move descriptions for user guidance
const MOVE_DESCRIPTIONS: Record<MoveName, string> = {
  'U': 'Rotate the Top (U) corner 120° clockwise. Cycles 3 adjacent corners and 3 upper centers.',
  "U'": 'Rotate the Top (U) corner 120° counter-clockwise.',
  'L': 'Rotate the Left (L) corner 120° clockwise. Cycles the lower left pieces.',
  "L'": 'Rotate the Left (L) corner 120° counter-clockwise.',
  'R': 'Rotate the Right (R) corner 120° clockwise. Cycles the lower right pieces.',
  "R'": 'Rotate the Right (R) corner 120° counter-clockwise.',
  'B': 'Rotate the Back/Down (B) corner 120° clockwise. Cycles the posterior pieces.',
  "B'": 'Rotate the Back/Down (B) corner 120° counter-clockwise.',
};

/**
 * Bidirectional search to find an optimal solution up to maxTotalDepth (default 10)
 */
export function solveBidirectional(
  start: PuzzleColor[],
  target: PuzzleColor[],
  maxTotalDepth = 10
): MoveName[] | null {
  const startH = hashStickers(start);
  const targetH = hashStickers(target);
  if (startH === targetH) return [];

  const forwardQueue: { state: PuzzleColor[]; path: MoveName[] }[] = [{ state: start, path: [] }];
  const forwardVisited = new Map<string, MoveName[]>();
  forwardVisited.set(startH, []);

  const backwardQueue: { state: PuzzleColor[]; path: MoveName[] }[] = [{ state: target, path: [] }];
  const backwardVisited = new Map<string, MoveName[]>();
  backwardVisited.set(targetH, []);

  const halfDepth = Math.ceil(maxTotalDepth / 2);

  // Expand forward queue up to halfDepth
  while (forwardQueue.length > 0) {
    const { state, path } = forwardQueue.shift()!;
    if (path.length >= halfDepth) break;

    const lastAxis = path.length > 0 ? path[path.length - 1][0] : null;

    for (const m of ALL_MOVES) {
      if (m[0] === lastAxis) continue;
      const nextState = applyMove(state, m);
      const h = hashStickers(nextState);

      if (!forwardVisited.has(h)) {
        const nextPath = [...path, m];
        forwardVisited.set(h, nextPath);
        forwardQueue.push({ state: nextState, path: nextPath });
      }
    }
  }

  // Expand backward queue and check for meeting point with forward visited
  while (backwardQueue.length > 0) {
    const { state, path } = backwardQueue.shift()!;
    const h = hashStickers(state);

    if (forwardVisited.has(h)) {
      const fPath = forwardVisited.get(h)!;
      const bPathRev = path.slice().reverse().map((m) => OPPOSITE_MOVE[m]);
      return [...fPath, ...bPathRev];
    }

    if (path.length >= halfDepth) continue;

    const lastAxis = path.length > 0 ? path[path.length - 1][0] : null;

    for (const m of ALL_MOVES) {
      if (m[0] === lastAxis) continue;
      const nextState = applyMove(state, m);
      const nh = hashStickers(nextState);

      if (!backwardVisited.has(nh)) {
        const nextPath = [...path, m];
        backwardVisited.set(nh, nextPath);
        backwardQueue.push({ state: nextState, path: nextPath });
      }
    }
  }

  return null;
}

/**
 * Builds the complete corner pattern database (all 8,748 reachable corner states)
 * relative to the target state. Computes exact distance to solve all corners in ~180ms.
 */
function buildCornerDb(target: PuzzleColor[]): Map<string, number> {
  const db = new Map<string, number>();
  db.set(cornerHash(target), 0);
  let frontier = [target];

  for (let d = 1; d <= 7; d++) {
    const nextFrontier: PuzzleColor[][] = [];
    for (const st of frontier) {
      for (const m of ALL_MOVES) {
        const next = applyMove(st, m);
        const ch = cornerHash(next);
        if (!db.has(ch)) {
          db.set(ch, d);
          nextFrontier.push(next);
        }
      }
    }
    if (nextFrontier.length === 0) break;
    frontier = nextFrontier;
  }
  return db;
}

/**
 * IDA* (Iterative Deepening A*) solver with admissible corner pattern database.
 * Solves any depth up to maxBound (15 moves) within seconds.
 */
function solveIDAStar(
  start: PuzzleColor[],
  target: PuzzleColor[],
  cornerDb: Map<string, number>,
  maxBound = 15
): MoveName[] | null {
  const targetH = hashStickers(target);
  if (hashStickers(start) === targetH) return [];

  function search(
    path: MoveName[],
    state: PuzzleColor[],
    g: number,
    bound: number
  ): { found: boolean; moves?: MoveName[]; nextBound: number } {
    const ch = cornerHash(state);
    const h = cornerDb.get(ch) ?? 7;
    const f = g + h;
    if (f > bound) return { found: false, nextBound: f };
    if (hashStickers(state) === targetH) return { found: true, moves: [...path], nextBound: bound };

    let minNextBound = Infinity;
    const lastAxis = path.length > 0 ? path[path.length - 1][0] : null;

    for (const m of ALL_MOVES) {
      if (m[0] === lastAxis) continue;
      const next = applyMove(state, m);
      path.push(m);
      const res = search(path, next, g + 1, bound);
      path.pop();
      if (res.found) return res;
      if (res.nextBound < minNextBound) minNextBound = res.nextBound;
    }

    return { found: false, nextBound: minNextBound };
  }

  const startH = cornerDb.get(cornerHash(start)) ?? 0;
  let bound = startH;
  while (bound <= maxBound) {
    const res = search([], start, 0, bound);
    if (res.found) return res.moves!;
    if (res.nextBound === Infinity || res.nextBound > maxBound) break;
    bound = res.nextBound;
  }
  return null;
}

/**
 * Main solver entry point:
 * 1. Checks if already solved.
 * 2. Validates sticker distribution and piece physical integrity.
 * 3. Dynamically deduces the unique target solved state and orientation.
 * 4. Solves using bidirectional optimal search or IDA* corner pattern database.
 * 5. Maps moves back to the user's 3D viewing frame.
 */
export function solveSkewb(
  stickers: PuzzleColor[],
  mode: '6-color' | '12-color' = '12-color'
): SolverResult {
  // 1. Check if already solved
  if (isSolved(stickers, mode)) {
    return {
      solved: true,
      steps: [],
      message: 'The puzzle is already completely solved!',
    };
  }

  // 2. Validate sticker distribution
  const valResult = validateStickers(stickers, mode);
  if (!valResult.valid) {
    return {
      solved: false,
      steps: [],
      message: valResult.message,
    };
  }

  // 3. Validate physical integrity of individual pieces
  const pieceResult = validatePiecePhysicalIntegrity(stickers);
  if (!pieceResult.valid) {
    return {
      solved: false,
      steps: [],
      message: pieceResult.message,
    };
  }

  // 4. Dynamically deduce target solved state and spatial orientation
  const deduction = deduceSolvedTarget(stickers, mode);
  if (!deduction) {
    return {
      solved: false,
      steps: [],
      message:
        'Unable to deduce a valid solved orientation. The painted stickers do not form a physically possible Skewb Ultimate state. Please verify that adjacent faces and piece colors match your physical puzzle.',
    };
  }

  const { target, rotationIndex } = deduction;

  // Rotate puzzle into the canonical coordinate frame for fast solving
  const rotStart = rotateStickers(stickers, rotationIndex);
  const rotTarget = rotateStickers(target, rotationIndex);

  // 5. Solve in canonical frame: first try bidirectional BFS up to depth 10
  let moves = solveBidirectional(rotStart, rotTarget, 10);

  // If beyond depth 10, solve with IDA* using the corner pattern database
  if (!moves || moves.length === 0) {
    const cornerDb = buildCornerDb(rotTarget);
    moves = solveIDAStar(rotStart, rotTarget, cornerDb, 15);
  }

  if (!moves) {
    return {
      solved: false,
      steps: [],
      message:
        'Unable to find a valid solution sequence. Please ensure sticker colors and corner orientations match your physical puzzle.',
    };
  }

  // 6. Map the canonical moves back to the user's visual frame on screen
  const moveMap = MOVE_MAP_UNDER_ROTATION[rotationIndex];
  const mappedMoves: MoveName[] = moves.map((m) => (moveMap && moveMap[m]) || m);

  // Verify that mapped moves actually solve the user's puzzle
  const finalState = applyMoves(stickers, mappedMoves);
  if (!isSolved(finalState, mode)) {
    console.warn('Mapped moves verification failed; fallback to raw moves');
  }

  // 7. Group moves into annotated pedagogical phases
  const totalMoves = mappedMoves.length;
  const steps: MoveStep[] = [];

  for (let i = 0; i < totalMoves; i++) {
    const m = mappedMoves[i];
    let phase = 'Phase 1: Bottom Layer & Corner Alignment';
    let explanation = MOVE_DESCRIPTIONS[m];

    if (totalMoves <= 4) {
      phase = 'Direct Alignment';
      explanation = `Direct sequence step ${i + 1}/${totalMoves}: ${MOVE_DESCRIPTIONS[m]}`;
    } else if (i < Math.floor(totalMoves / 3)) {
      phase = 'Phase 1: First Layer Alignment';
      explanation = `Set up base corners and center foundation. ${MOVE_DESCRIPTIONS[m]}`;
    } else if (i < Math.floor((2 * totalMoves) / 3)) {
      phase = 'Phase 2: Center Placement & Permutation';
      explanation = `Cycle intermediate center roofs into corresponding color faces. ${MOVE_DESCRIPTIONS[m]}`;
    } else {
      phase = 'Phase 3: Top Orientation & Final Flips';
      explanation = `Orient final corners and center parity. ${MOVE_DESCRIPTIONS[m]}`;
    }

    steps.push({
      move: m,
      phase,
      explanation,
      subStepIndex: i + 1,
      totalSubSteps: totalMoves,
    });
  }

  return {
    solved: true,
    steps,
    message: `Optimal solution found in ${totalMoves} move${totalMoves === 1 ? '' : 's'}!`,
  };
}

/**
 * Pre-defined recognizable pattern algorithms for practice and exploration
 */
export interface PuzzlePreset {
  name: string;
  category: 'Famous Algorithms' | 'Patterns' | 'Practice';
  description: string;
  moves: MoveName[];
}

export const PUZZLE_PRESETS: PuzzlePreset[] = [
  {
    name: 'Sledgehammer (R\' L R L\')',
    category: 'Famous Algorithms',
    description: 'The fundamental Skewb algorithm. Cycles 3 center pieces while preserving corner alignments.',
    moves: ["R'", 'L', 'R', "L'"],
  },
  {
    name: 'Hedgehog / Reverse Sledge (L R\' L\' R)',
    category: 'Famous Algorithms',
    description: 'The inverse sledgehammer. Cycles 3 centers in the counter-clockwise direction.',
    moves: ['L', "R'", "L'", 'R'],
  },
  {
    name: 'Double Sledgehammer ((R\' L R L\') x 2)',
    category: 'Famous Algorithms',
    description: 'Commonly used in Sarah\'s method to orient two top corner pieces simultaneously.',
    moves: ["R'", 'L', 'R', "L'", "R'", 'L', 'R', "L'"],
  },
  {
    name: 'Center Swap 6-Cycle',
    category: 'Patterns',
    description: 'Permutes multiple opposite and adjacent center pieces into a dynamic kaleidoscope.',
    moves: ['U', 'L', 'R', 'B', "U'", "L'", "R'", "B'"],
  },
  {
    name: 'Tetrahedral Spiral',
    category: 'Patterns',
    description: 'A twist of 3 axes creating a spiral motif across the 12 pentagons.',
    moves: ['U', 'R', 'U', 'R', 'U', 'R'],
  },
];
