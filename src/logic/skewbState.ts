/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DODECA_FACES, CUT_PLANES, FACE_TEMPLATES } from './geometry';
import { MoveName, PuzzleColor } from '../types/puzzle';

export interface FlatFacetInfo {
  flatIndex: number;
  faceIndex: number;
  facetIndexInFace: number;
  id: string;
  pieceType: 'corner' | 'center';
  pieceIndex: number;
  centroid: [number, number, number];
  defaultColor6: PuzzleColor;
  defaultColor12: PuzzleColor;
}

// Build flat array of all 48 facets in deterministic order
export const FLAT_FACETS: FlatFacetInfo[] = [];

DODECA_FACES.forEach((face) => {
  face.facets.forEach((fac) => {
    FLAT_FACETS.push({
      flatIndex: FLAT_FACETS.length,
      faceIndex: fac.faceIndex,
      facetIndexInFace: fac.facetIndexInFace,
      id: fac.id,
      pieceType: fac.pieceType,
      pieceIndex: fac.pieceIndex,
      centroid: fac.centroid,
      defaultColor6: FACE_TEMPLATES[fac.faceIndex].default6Color,
      defaultColor12: FACE_TEMPLATES[fac.faceIndex].default12Color,
    });
  });
});

// Vector math helpers for permutation generation
function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function rotateVector(
  v: [number, number, number],
  axis: [number, number, number],
  angleRad: number
): [number, number, number] {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  const cr = cross(axis, v);
  const dt = dot(axis, v);
  return [
    v[0] * c + cr[0] * s + axis[0] * dt * (1 - c),
    v[1] * c + cr[1] * s + axis[1] * dt * (1 - c),
    v[2] * c + cr[2] * s + axis[2] * dt * (1 - c),
  ];
}

// Precompute permutation tables for all 8 moves
// targetIndex = MOVE_PERMUTATIONS[move][sourceIndex]
// meaning the sticker at sourceIndex moves to targetIndex
export const MOVE_PERMUTATIONS: Record<MoveName, number[]> = {} as Record<MoveName, number[]>;

const BASE_MOVES: { name: 'U' | 'L' | 'R' | 'B'; planeIndex: number }[] = [
  { name: 'U', planeIndex: 0 },
  { name: 'L', planeIndex: 1 },
  { name: 'R', planeIndex: 2 },
  { name: 'B', planeIndex: 3 },
];

BASE_MOVES.forEach(({ name, planeIndex }) => {
  const axis = CUT_PLANES[planeIndex].normal;
  const cwPerm: number[] = [];
  const ccwPerm: number[] = [];

  for (let i = 0; i < FLAT_FACETS.length; i++) {
    const orig = FLAT_FACETS[i];
    if (dot(orig.centroid, axis) > 0.05) {
      // Rotates around axis
      const rotCW = rotateVector(orig.centroid, axis, (2 * Math.PI) / 3);
      const rotCCW = rotateVector(orig.centroid, axis, (-2 * Math.PI) / 3);

      let bestCW = i;
      let bestDistCW = Infinity;
      let bestCCW = i;
      let bestDistCCW = Infinity;

      for (let j = 0; j < FLAT_FACETS.length; j++) {
        const target = FLAT_FACETS[j];
        const distCW = Math.hypot(
          rotCW[0] - target.centroid[0],
          rotCW[1] - target.centroid[1],
          rotCW[2] - target.centroid[2]
        );
        if (distCW < bestDistCW) {
          bestDistCW = distCW;
          bestCW = j;
        }

        const distCCW = Math.hypot(
          rotCCW[0] - target.centroid[0],
          rotCCW[1] - target.centroid[1],
          rotCCW[2] - target.centroid[2]
        );
        if (distCCW < bestDistCCW) {
          bestDistCCW = distCCW;
          bestCCW = j;
        }
      }

      cwPerm[i] = bestCW;
      ccwPerm[i] = bestCCW;
    } else {
      cwPerm[i] = i;
      ccwPerm[i] = i;
    }
  }

  MOVE_PERMUTATIONS[name] = cwPerm;
  MOVE_PERMUTATIONS[`${name}'` as MoveName] = ccwPerm;
});

// The 12 rotations in the chiral tetrahedral group T that preserve the 4 cut planes of the dodecahedron
export const T_MATRICES: number[][][] = [
  // Identity
  [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  // 180 deg around X, Y, Z
  [[1, 0, 0], [0, -1, 0], [0, 0, -1]],
  [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
  [[-1, 0, 0], [0, -1, 0], [0, 0, 1]],
  // Cyclic permutations of (x, y, z) with even sign changes (120° and 240° corner rotations)
  [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
  [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
  [[0, -1, 0], [0, 0, -1], [1, 0, 0]],
  [[0, 0, 1], [-1, 0, 0], [0, -1, 0]],
  [[0, -1, 0], [0, 0, 1], [-1, 0, 0]],
  [[0, 0, -1], [1, 0, 0], [0, -1, 0]],
  [[0, 1, 0], [0, 0, -1], [-1, 0, 0]],
  [[0, 0, -1], [-1, 0, 0], [0, 1, 0]],
];

// Precompute permutation of the 48 facets under each of the 12 rotations in T
export const ROTATION_PERMUTATIONS: number[][] = [];
for (const M of T_MATRICES) {
  const perm: number[] = [];
  for (let i = 0; i < FLAT_FACETS.length; i++) {
    const c = FLAT_FACETS[i].centroid;
    const rc = [
      M[0][0] * c[0] + M[0][1] * c[1] + M[0][2] * c[2],
      M[1][0] * c[0] + M[1][1] * c[1] + M[1][2] * c[2],
      M[2][0] * c[0] + M[2][1] * c[1] + M[2][2] * c[2],
    ];
    let best = i;
    let bestDist = Infinity;
    for (let j = 0; j < FLAT_FACETS.length; j++) {
      const d = Math.hypot(
        rc[0] - FLAT_FACETS[j].centroid[0],
        rc[1] - FLAT_FACETS[j].centroid[1],
        rc[2] - FLAT_FACETS[j].centroid[2]
      );
      if (d < bestDist) {
        bestDist = d;
        best = j;
      }
    }
    perm.push(best);
  }
  ROTATION_PERMUTATIONS.push(perm);
}

// Function to rotate an entire sticker array by rotation index r (0..11)
export function rotateStickers(stickers: PuzzleColor[], rotIdx: number): PuzzleColor[] {
  const perm = ROTATION_PERMUTATIONS[rotIdx];
  const out = new Array<PuzzleColor>(stickers.length);
  for (let i = 0; i < stickers.length; i++) {
    out[perm[i]] = stickers[i];
  }
  return out;
}

// Precompute inverse rotation indices
export const INV_ROTATION: number[] = [];
for (let i = 0; i < 12; i++) {
  for (let j = 0; j < 12; j++) {
    let isInv = true;
    for (let k = 0; k < FLAT_FACETS.length; k++) {
      if (ROTATION_PERMUTATIONS[j][ROTATION_PERMUTATIONS[i][k]] !== k) {
        isInv = false;
        break;
      }
    }
    if (isInv) {
      INV_ROTATION.push(j);
      break;
    }
  }
}

// Mapping of moves from rotated frame back to the user's canonical viewing frame
const ALL_MOVES_LIST: MoveName[] = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"];
export const MOVE_MAP_UNDER_ROTATION: Record<number, Record<MoveName, MoveName>> = {};

const defaultSolvedStickers = FLAT_FACETS.map((f) => f.defaultColor12);
for (let r = 0; r < 12; r++) {
  MOVE_MAP_UNDER_ROTATION[r] = {} as Record<MoveName, MoveName>;
  const invR = INV_ROTATION[r];
  for (const m of ALL_MOVES_LIST) {
    const targetState = rotateStickers(applyMove(rotateStickers(defaultSolvedStickers, r), m), invR);
    for (const cand of ALL_MOVES_LIST) {
      const candState = applyMove(defaultSolvedStickers, cand);
      let match = true;
      for (let k = 0; k < FLAT_FACETS.length; k++) {
        if (candState[k] !== targetState[k]) {
          match = false;
          break;
        }
      }
      if (match) {
        MOVE_MAP_UNDER_ROTATION[r][m] = cand;
        break;
      }
    }
  }
}

// Solved sticker states
export function getSolvedStickers(mode: '6-color' | '12-color' = '12-color'): PuzzleColor[] {
  return FLAT_FACETS.map((f) => (mode === '6-color' ? f.defaultColor6 : f.defaultColor12));
}

// Apply a single move to a sticker array
export function applyMove(stickers: PuzzleColor[], move: MoveName): PuzzleColor[] {
  const perm = MOVE_PERMUTATIONS[move];
  if (!perm) return [...stickers];
  const newStickers = new Array<PuzzleColor>(stickers.length);
  for (let i = 0; i < stickers.length; i++) {
    newStickers[perm[i]] = stickers[i];
  }
  return newStickers;
}

// Apply multiple moves in sequence
export function applyMoves(stickers: PuzzleColor[], moves: MoveName[]): PuzzleColor[] {
  let current = stickers;
  for (const m of moves) {
    current = applyMove(current, m);
  }
  return current;
}

// Check if the puzzle is currently solved
export function isSolved(stickers: PuzzleColor[], mode: '6-color' | '12-color' = '12-color'): boolean {
  // A face is solved if all 4 stickers on that face have the identical color
  for (let f = 0; f < 12; f++) {
    const baseColor = stickers[f * 4];
    for (let k = 1; k < 4; k++) {
      if (stickers[f * 4 + k] !== baseColor) {
        return false;
      }
    }
  }

  // If in 6-color mode, also check that opposite faces have matching colors
  if (mode === '6-color') {
    for (let f = 0; f < 12; f++) {
      const oppIdx = FACE_TEMPLATES[f].oppositeIndex;
      if (stickers[f * 4] !== stickers[oppIdx * 4]) {
        return false;
      }
    }
  }

  return true;
}

// Generate a random scramble
export function generateScramble(
  stickers: PuzzleColor[],
  moveCount = 14
): { newStickers: PuzzleColor[]; moves: MoveName[] } {
  const allMoves: MoveName[] = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"];
  const moves: MoveName[] = [];
  let lastAxis = -1;

  for (let i = 0; i < moveCount; i++) {
    let axis: number;
    do {
      axis = Math.floor(Math.random() * 4);
    } while (axis === lastAxis);

    const dir = Math.random() < 0.5 ? 0 : 1;
    const move = allMoves[axis * 2 + dir];
    moves.push(move);
    lastAxis = axis;
  }

  const newStickers = applyMoves(stickers, moves);
  return { newStickers, moves };
}

// Return the list of 4 stickers for each face
export function getFaceStickers(stickers: PuzzleColor[]): PuzzleColor[][] {
  const result: PuzzleColor[][] = [];
  for (let f = 0; f < 12; f++) {
    result.push([
      stickers[f * 4],
      stickers[f * 4 + 1],
      stickers[f * 4 + 2],
      stickers[f * 4 + 3],
    ]);
  }
  return result;
}

// Helpers for piece facet lookups
function getCornerFlatIndex(cornerIdx: number, faceIdx: number): number {
  return FLAT_FACETS.findIndex(
    (fl) => fl.pieceType === 'corner' && fl.pieceIndex === cornerIdx && fl.faceIndex === faceIdx
  );
}
function getCenterFlatIndex(centerIdx: number, faceIdx: number): number {
  return FLAT_FACETS.findIndex(
    (fl) => fl.pieceType === 'center' && fl.pieceIndex === centerIdx && fl.faceIndex === faceIdx
  );
}

// Fixed corners (0..3) and their touching faces
const FIXED_CORNERS = [
  { cornerIdx: 0, faces: [0, 4, 8] },
  { cornerIdx: 1, faces: [1, 6, 10] },
  { cornerIdx: 2, faces: [2, 5, 11] },
  { cornerIdx: 3, faces: [3, 7, 9] },
];

// Moving corners (4..7) and their touching faces
const MOVING_CORNERS = [
  { cornerIdx: 4, faces: [1, 5, 9] },
  { cornerIdx: 5, faces: [0, 7, 11] },
  { cornerIdx: 6, faces: [3, 4, 10] },
  { cornerIdx: 7, faces: [2, 6, 8] },
];

// 6 center pieces and their 4 touching faces
const CENTER_PIECES = [
  { centerIdx: 0, faces: [4, 6, 8, 10] },
  { centerIdx: 1, faces: [5, 7, 9, 11] },
  { centerIdx: 2, faces: [0, 2, 8, 11] },
  { centerIdx: 3, faces: [1, 3, 9, 10] },
  { centerIdx: 4, faces: [0, 3, 4, 7] },
  { centerIdx: 5, faces: [1, 2, 5, 6] },
];

// Validation of individual physical piece integrity (no duplicate colors on the same piece)
export function validatePiecePhysicalIntegrity(
  stickers: PuzzleColor[]
): { valid: boolean; message: string; conflictingIndices?: number[] } {
  // Check all 8 corners
  const allCorners = [...FIXED_CORNERS, ...MOVING_CORNERS];
  for (const c of allCorners) {
    const flatIndices = c.faces.map((f) => getCornerFlatIndex(c.cornerIdx, f));
    const colors = flatIndices.map((idx) => stickers[idx]);
    const counts: Record<string, number> = {};
    colors.forEach((col) => {
      counts[col] = (counts[col] || 0) + 1;
    });
    const duplicates = Object.keys(counts).filter((col) => counts[col] > 1);
    if (duplicates.length > 0) {
      const faceNames = c.faces
        .map((f) => `Face ${f + 1} (${FACE_TEMPLATES[f].name.split(' ')[0]})`)
        .join(', ');
      return {
        valid: false,
        message: `Corner piece touching ${faceNames} has duplicate "${duplicates.join(', ')}" stickers. Each physical corner piece must have 3 distinct colors. Please check your physical puzzle and repaint the incorrect facet.`,
        conflictingIndices: flatIndices,
      };
    }
  }

  // Check all 6 centers
  for (const ctr of CENTER_PIECES) {
    const flatIndices = ctr.faces.map((f) => getCenterFlatIndex(ctr.centerIdx, f));
    const colors = flatIndices.map((idx) => stickers[idx]);
    const counts: Record<string, number> = {};
    colors.forEach((col) => {
      counts[col] = (counts[col] || 0) + 1;
    });
    const duplicates = Object.keys(counts).filter((col) => counts[col] > 1);
    if (duplicates.length > 0) {
      const duplicateFaces = ctr.faces
        .map((f, i) => ({
          faceNum: f + 1,
          name: FACE_TEMPLATES[f].name.split(' ')[0],
          color: colors[i],
        }))
        .filter((item) => duplicates.includes(item.color));
      const dupDetails = duplicateFaces
        .map((df) => `Face ${df.faceNum} (${df.name})`)
        .join(' and ');
      const allFaceNames = ctr.faces
        .map((f) => `Face ${f + 1} (${FACE_TEMPLATES[f].name.split(' ')[0]})`)
        .join(', ');

      return {
        valid: false,
        message: `Center piece touching ${allFaceNames} has duplicate "${duplicates.join(', ')}" on ${dupDetails}. Physical center pieces must have 4 distinct colors. Please check your physical puzzle and repaint the incorrect facet.`,
        conflictingIndices: flatIndices,
      };
    }
  }

  return { valid: true, message: 'Piece physical integrity is valid' };
}

// Validation of sticker counts with clear user-friendly diagnostics
export function validateStickers(
  stickers: PuzzleColor[],
  mode: '6-color' | '12-color' = '12-color'
): { valid: boolean; message: string; counts: Record<string, number> } {
  const counts: Record<string, number> = {};
  for (const c of stickers) {
    counts[c] = (counts[c] || 0) + 1;
  }

  const expected = mode === '6-color' ? 8 : 4;
  const maxColors = mode === '6-color' ? 6 : 12;
  const colors = Object.keys(counts);

  const surplus: string[] = [];
  const deficit: string[] = [];

  for (const [col, cnt] of Object.entries(counts)) {
    if (cnt > expected) {
      surplus.push(`${col} (${cnt}/${expected}, +${cnt - expected})`);
    } else if (cnt < expected) {
      deficit.push(`${col} (${cnt}/${expected}, -${expected - cnt})`);
    }
  }

  if (colors.length > maxColors) {
    return {
      valid: false,
      message: `Found ${colors.length} different colors. ${mode} mode expects at most ${maxColors} colors.`,
      counts,
    };
  }

  if (surplus.length > 0 || deficit.length > 0) {
    const details = [
      surplus.length > 0 ? `Surplus: ${surplus.join(', ')}` : '',
      deficit.length > 0 ? `Deficit: ${deficit.join(', ')}` : '',
    ].filter(Boolean).join(' | ');

    return {
      valid: false,
      message: `Sticker count mismatch. In ${mode} mode, every color requires exactly ${expected} stickers. ${details}`,
      counts,
    };
  }

  return { valid: true, message: 'Valid sticker distribution', counts };
}

/**
 * Dynamically deduce the unique target monochromatic solved state for ANY user setup,
 * testing across all 12 spatial rotations in T to match whatever orientation the user painted.
 */
export function deduceSolvedTarget(
  stickers: PuzzleColor[],
  mode: '6-color' | '12-color' = '12-color'
): { target: PuzzleColor[]; rotationIndex: number } | null {
  for (let r = 0; r < 12; r++) {
    const rotState = rotateStickers(stickers, r);
    const puzzleMovingCorners = MOVING_CORNERS.map((mc) =>
      mc.faces.map((f) => rotState[getCornerFlatIndex(mc.cornerIdx, f)]).sort().join('-')
    );
    const puzzleCenters = CENTER_PIECES.map((c) =>
      c.faces.map((f) => rotState[getCenterFlatIndex(c.centerIdx, f)]).sort().join('-')
    );

    for (let o0 = 0; o0 < 3; o0++) {
      for (let o1 = 0; o1 < 3; o1++) {
        for (let o2 = 0; o2 < 3; o2++) {
          for (let o3 = 0; o3 < 3; o3++) {
            const faceColors: (PuzzleColor | null)[] = new Array(12).fill(null);
            const c0 = FIXED_CORNERS[0].faces.map((f) => rotState[getCornerFlatIndex(0, f)]);
            faceColors[0] = c0[o0 % 3];
            faceColors[4] = c0[(1 + o0) % 3];
            faceColors[8] = c0[(2 + o0) % 3];

            const c1 = FIXED_CORNERS[1].faces.map((f) => rotState[getCornerFlatIndex(1, f)]);
            faceColors[1] = c1[o1 % 3];
            faceColors[6] = c1[(1 + o1) % 3];
            faceColors[10] = c1[(2 + o1) % 3];

            const c2 = FIXED_CORNERS[2].faces.map((f) => rotState[getCornerFlatIndex(2, f)]);
            faceColors[2] = c2[o2 % 3];
            faceColors[5] = c2[(1 + o2) % 3];
            faceColors[11] = c2[(2 + o2) % 3];

            const c3 = FIXED_CORNERS[3].faces.map((f) => rotState[getCornerFlatIndex(3, f)]);
            faceColors[3] = c3[o3 % 3];
            faceColors[7] = c3[(1 + o3) % 3];
            faceColors[9] = c3[(2 + o3) % 3];

            if (mode === '6-color') {
              // Opposite faces must match: (0,1), (2,3), (4,5), (6,7), (8,9), (10,11)
              if (faceColors[0] !== faceColors[1]) continue;
              if (faceColors[2] !== faceColors[3]) continue;
              if (faceColors[4] !== faceColors[5]) continue;
              if (faceColors[6] !== faceColors[7]) continue;
              if (faceColors[8] !== faceColors[9]) continue;
              if (faceColors[10] !== faceColors[11]) continue;
            }

            // Verify moving corners match
            const neededMoving = MOVING_CORNERS.map((mc) =>
              mc.faces.map((f) => faceColors[f]!).sort().join('-')
            );
            if ([...neededMoving].sort().join(',') !== [...puzzleMovingCorners].sort().join(',')) {
              continue;
            }

            // Verify center pieces match
            const neededCenters = CENTER_PIECES.map((c) =>
              c.faces.map((f) => faceColors[f]!).sort().join('-')
            );
            if ([...neededCenters].sort().join(',') !== [...puzzleCenters].sort().join(',')) {
              continue;
            }

            // Match confirmed! Construct full 48-sticker solved array
            const target: PuzzleColor[] = [];
            for (let i = 0; i < FLAT_FACETS.length; i++) {
              target.push(faceColors[FLAT_FACETS[i].faceIndex]!);
            }
            return { target, rotationIndex: r };
          }
        }
      }
    }
  }
  return null;
}
