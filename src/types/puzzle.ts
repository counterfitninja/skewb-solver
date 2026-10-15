/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PuzzleColor = 
  | 'white' 
  | 'yellow' 
  | 'blue' 
  | 'green' 
  | 'red' 
  | 'orange'
  | 'purple'
  | 'pink'
  | 'cyan'
  | 'lime'
  | 'silver'
  | 'amber';

export interface ColorSchemeConfig {
  mode: '6-color' | '12-color';
  faceColors: PuzzleColor[];
}

export type MoveName = 'U' | "U'" | 'L' | "L'" | 'R' | "R'" | 'B' | "B'";

export interface FacetDefinition {
  id: string; // e.g., "face-0-facet-0"
  faceIndex: number; // 0..11
  facetIndexInFace: number; // 0..3
  pieceType: 'corner' | 'center';
  pieceIndex: number; // 0..7 for corners, 0..5 for centers
  stickerIndexInPiece: number; // 0..2 for corner, 0..3 for center
  vertices: [number, number, number][]; // 3D coordinates on the dodecahedron surface
  centroid: [number, number, number];
  normal: [number, number, number];
}

export interface DodecahedronFace {
  index: number;
  name: string;
  oppositeFaceIndex: number;
  normal: [number, number, number];
  vertices: [number, number, number][];
  facets: FacetDefinition[];
}

export interface MoveStep {
  move: MoveName;
  phase: string;
  explanation: string;
  subStepIndex?: number;
  totalSubSteps?: number;
}

export interface SolverResult {
  solved: boolean;
  steps: MoveStep[];
  message: string;
}

// 8 corners: each piece 0..7 has position 0..7 and orientation 0..2
// 6 centers: each piece 0..5 has position 0..5 and orientation 0..1 (flipped or normal)
export interface SkewbMathState {
  cornerPerm: number[]; // length 8: which corner piece is at slot i
  cornerOrient: number[]; // length 8: orientation (0, 1, 2) of corner at slot i
  centerPerm: number[]; // length 6: which center piece is at slot i
  centerOrient: number[]; // length 6: flip (0 or 1) of center at slot i
}
