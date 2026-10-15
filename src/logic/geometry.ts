/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DodecahedronFace, FacetDefinition, PuzzleColor } from '../types/puzzle';

export const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio ~1.6180339887

// 20 Vertices of the regular dodecahedron
export const DODECA_VERTICES: [number, number, number][] = [
  // 8 Cube vertices (±1, ±1, ±1)
  [1, 1, 1], // 0
  [1, 1, -1], // 1
  [1, -1, 1], // 2
  [1, -1, -1], // 3
  [-1, 1, 1], // 4
  [-1, 1, -1], // 5
  [-1, -1, 1], // 6
  [-1, -1, -1], // 7

  // 4 Vertices on y-z plane (0, ±phi, ±1/phi)
  [0, PHI, 1 / PHI], // 8
  [0, PHI, -1 / PHI], // 9
  [0, -PHI, 1 / PHI], // 10
  [0, -PHI, -1 / PHI], // 11

  // 4 Vertices on x-z plane (±1/phi, 0, ±phi)
  [1 / PHI, 0, PHI], // 12
  [1 / PHI, 0, -PHI], // 13
  [-1 / PHI, 0, PHI], // 14
  [-1 / PHI, 0, -PHI], // 15

  // 4 Vertices on x-y plane (±phi, ±1/phi, 0)
  [PHI, 1 / PHI, 0], // 16
  [PHI, -1 / PHI, 0], // 17
  [-PHI, 1 / PHI, 0], // 18
  [-PHI, -1 / PHI, 0], // 19
];

// 4 Cut planes (normals of the 4 axes of the Skewb)
// Normal vectors are unit length along the 4 tetrahedral space diagonals
const INV_SQRT3 = 1 / Math.sqrt(3);

export interface CutPlane {
  index: number;
  name: string; // 'U', 'L', 'R', 'B'
  normal: [number, number, number];
}

export const CUT_PLANES: CutPlane[] = [
  { index: 0, name: 'U', normal: [INV_SQRT3, INV_SQRT3, INV_SQRT3] },
  { index: 1, name: 'L', normal: [INV_SQRT3, -INV_SQRT3, -INV_SQRT3] },
  { index: 2, name: 'R', normal: [-INV_SQRT3, INV_SQRT3, -INV_SQRT3] },
  { index: 3, name: 'B', normal: [-INV_SQRT3, -INV_SQRT3, INV_SQRT3] },
];

export interface PieceSignature {
  type: 'corner' | 'center';
  index: number;
  name: string;
  // Sign requirement for each plane: +1 for positive side, -1 for negative side
  signs: [number, number, number, number];
  representativePoint: [number, number, number];
}

// 8 Corner piece signatures (4 fixed corners with 1 positive, 4 moving corners with 3 positives)
export const CORNER_SIGNATURES: PieceSignature[] = [
  // 4 Fixed Corners (Orbit A)
  { type: 'corner', index: 0, name: 'Fixed U (1,1,1)', signs: [1, -1, -1, -1], representativePoint: [1, 1, 1] },
  { type: 'corner', index: 1, name: 'Fixed L (1,-1,-1)', signs: [-1, 1, -1, -1], representativePoint: [1, -1, -1] },
  { type: 'corner', index: 2, name: 'Fixed R (-1,1,-1)', signs: [-1, -1, 1, -1], representativePoint: [-1, 1, -1] },
  { type: 'corner', index: 3, name: 'Fixed B (-1,-1,1)', signs: [-1, -1, -1, 1], representativePoint: [-1, -1, 1] },

  // 4 Moving Corners (Orbit B)
  { type: 'corner', index: 4, name: 'Move (-1,-1,-1)', signs: [-1, 1, 1, 1], representativePoint: [-1, -1, -1] },
  { type: 'corner', index: 5, name: 'Move (-1,1,1)', signs: [1, -1, 1, 1], representativePoint: [-1, 1, 1] },
  { type: 'corner', index: 6, name: 'Move (1,-1,1)', signs: [1, 1, -1, 1], representativePoint: [1, -1, 1] },
  { type: 'corner', index: 7, name: 'Move (1,1,-1)', signs: [1, 1, 1, -1], representativePoint: [1, 1, -1] },
];

// 6 Center piece signatures (each has 2 positives and 2 negatives)
export const CENTER_SIGNATURES: PieceSignature[] = [
  { type: 'center', index: 0, name: '+X (Right)', signs: [1, 1, -1, -1], representativePoint: [1, 0, 0] },
  { type: 'center', index: 1, name: '-X (Left)', signs: [-1, -1, 1, 1], representativePoint: [-1, 0, 0] },
  { type: 'center', index: 2, name: '+Y (Up)', signs: [1, -1, 1, -1], representativePoint: [0, 1, 0] },
  { type: 'center', index: 3, name: '-Y (Down)', signs: [-1, 1, -1, 1], representativePoint: [0, -1, 0] },
  { type: 'center', index: 4, name: '+Z (Front)', signs: [1, -1, -1, 1], representativePoint: [0, 0, 1] },
  { type: 'center', index: 5, name: '-Z (Back)', signs: [-1, 1, 1, -1], representativePoint: [0, 0, -1] },
];

export const ALL_PIECE_SIGNATURES: PieceSignature[] = [
  ...CORNER_SIGNATURES,
  ...CENTER_SIGNATURES,
];

// Vector math helpers
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

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

// 12 Face Normal templates
interface FaceTemplate {
  name: string;
  rawNormal: [number, number, number];
  oppositeIndex: number;
  default6Color: PuzzleColor;
  default12Color: PuzzleColor;
}

export const FACE_TEMPLATES: FaceTemplate[] = [
  { name: 'Top Front (TF)', rawNormal: [0, 1, PHI], oppositeIndex: 1, default6Color: 'white', default12Color: 'white' },
  { name: 'Bottom Back (BB)', rawNormal: [0, -1, -PHI], oppositeIndex: 0, default6Color: 'white', default12Color: 'yellow' },

  { name: 'Top Back (TB)', rawNormal: [0, 1, -PHI], oppositeIndex: 3, default6Color: 'yellow', default12Color: 'lime' },
  { name: 'Bottom Front (BF)', rawNormal: [0, -1, PHI], oppositeIndex: 2, default6Color: 'yellow', default12Color: 'green' },

  { name: 'Right Front (RF)', rawNormal: [PHI, 0, 1], oppositeIndex: 5, default6Color: 'blue', default12Color: 'blue' },
  { name: 'Left Back (LB)', rawNormal: [-PHI, 0, -1], oppositeIndex: 4, default6Color: 'blue', default12Color: 'cyan' },

  { name: 'Right Back (RB)', rawNormal: [PHI, 0, -1], oppositeIndex: 7, default6Color: 'green', default12Color: 'amber' },
  { name: 'Left Front (LF)', rawNormal: [-PHI, 0, 1], oppositeIndex: 6, default6Color: 'green', default12Color: 'orange' },

  { name: 'Top Right (TR)', rawNormal: [1, PHI, 0], oppositeIndex: 9, default6Color: 'red', default12Color: 'red' },
  { name: 'Bottom Left (BL)', rawNormal: [-1, -PHI, 0], oppositeIndex: 8, default6Color: 'red', default12Color: 'pink' },

  { name: 'Bottom Right (BR)', rawNormal: [1, -PHI, 0], oppositeIndex: 11, default6Color: 'orange', default12Color: 'purple' },
  { name: 'Top Left (TL)', rawNormal: [-1, PHI, 0], oppositeIndex: 10, default6Color: 'orange', default12Color: 'silver' },
];

// Sutherland-Hodgman Polygon Clipping against a 3D half-space plane (normal · p >= 0)
function clipPolygon(
  polygon: [number, number, number][],
  planeNormal: [number, number, number],
  sign: number,
  epsilon = 1e-6
): [number, number, number][] {
  if (polygon.length === 0) return [];

  const effectiveNormal: [number, number, number] = [
    sign * planeNormal[0],
    sign * planeNormal[1],
    sign * planeNormal[2],
  ];

  const out: [number, number, number][] = [];

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    const dCurr = dot(current, effectiveNormal);
    const dNext = dot(next, effectiveNormal);

    const currIn = dCurr >= -epsilon;
    const nextIn = dNext >= -epsilon;

    if (currIn) {
      out.push(current);
    }

    if (currIn !== nextIn) {
      // Intersection parameter t
      const t = dCurr / (dCurr - dNext);
      const clampedT = Math.max(0, Math.min(1, t));
      const ix: [number, number, number] = [
        current[0] + clampedT * (next[0] - current[0]),
        current[1] + clampedT * (next[1] - current[1]),
        current[2] + clampedT * (next[2] - current[2]),
      ];
      out.push(ix);
    }
  }

  return out;
}

// Compute area of a 3D polygon
function polygonArea(poly: [number, number, number][], normal: [number, number, number]): number {
  if (poly.length < 3) return 0;
  let totalCross: [number, number, number] = [0, 0, 0];
  const p0 = poly[0];
  for (let i = 1; i < poly.length - 1; i++) {
    const v1: [number, number, number] = [poly[i][0] - p0[0], poly[i][1] - p0[1], poly[i][2] - p0[2]];
    const v2: [number, number, number] = [poly[i + 1][0] - p0[0], poly[i + 1][1] - p0[1], poly[i + 1][2] - p0[2]];
    const cr = cross(v1, v2);
    totalCross[0] += cr[0];
    totalCross[1] += cr[1];
    totalCross[2] += cr[2];
  }
  return 0.5 * Math.abs(dot(totalCross, normal));
}

// Compute centroid of 3D polygon
function polygonCentroid(poly: [number, number, number][]): [number, number, number] {
  let cx = 0, cy = 0, cz = 0;
  for (const p of poly) {
    cx += p[0];
    cy += p[1];
    cz += p[2];
  }
  const n = poly.length;
  return [cx / n, cy / n, cz / n];
}

// Build all 12 faces and their exact clipped facets
export function generateDodecahedronFaces(): DodecahedronFace[] {
  const faces: DodecahedronFace[] = [];

  for (let fIdx = 0; fIdx < FACE_TEMPLATES.length; fIdx++) {
    const tmpl = FACE_TEMPLATES[fIdx];
    const unitNormal = normalize(tmpl.rawNormal);

    // Find 5 vertices that lie on this face (maximum dot product with rawNormal)
    const dots = DODECA_VERTICES.map((v) => dot(tmpl.rawNormal, v));
    const maxDot = Math.max(...dots);
    const faceVerts: [number, number, number][] = DODECA_VERTICES.filter(
      (v) => Math.abs(dot(tmpl.rawNormal, v) - maxDot) < 1e-4
    );

    if (faceVerts.length !== 5) {
      console.warn(`Face ${fIdx} found ${faceVerts.length} vertices instead of 5`);
    }

    // Sort the 5 vertices in counter-clockwise order around unitNormal
    const center = polygonCentroid(faceVerts);
    const u = normalize([faceVerts[0][0] - center[0], faceVerts[0][1] - center[1], faceVerts[0][2] - center[2]]);
    const w = cross(unitNormal, u);

    faceVerts.sort((vA, vB) => {
      const vecA: [number, number, number] = [vA[0] - center[0], vA[1] - center[1], vA[2] - center[2]];
      const vecB: [number, number, number] = [vB[0] - center[0], vB[1] - center[1], vB[2] - center[2]];
      const angA = Math.atan2(dot(vecA, w), dot(vecA, u));
      const angB = Math.atan2(dot(vecB, w), dot(vecB, u));
      return angA - angB;
    });

    // Now clip this pentagon against each piece signature's 4 cut planes
    const faceFacets: FacetDefinition[] = [];

    for (const sig of ALL_PIECE_SIGNATURES) {
      let poly = [...faceVerts];
      for (let pIdx = 0; pIdx < CUT_PLANES.length; pIdx++) {
        poly = clipPolygon(poly, CUT_PLANES[pIdx].normal, sig.signs[pIdx]);
        if (poly.length < 3) break;
      }

      if (poly.length >= 3 && polygonArea(poly, unitNormal) > 0.01) {
        const centroid = polygonCentroid(poly);
        faceFacets.push({
          id: `f${fIdx}-${sig.type}-${sig.index}`,
          faceIndex: fIdx,
          facetIndexInFace: faceFacets.length,
          pieceType: sig.type,
          pieceIndex: sig.index,
          stickerIndexInPiece: 0, // Assigned below
          vertices: poly,
          centroid,
          normal: unitNormal,
        });
      }
    }

    // Ensure we found exactly 4 facets on this pentagon
    // (2 corner facets and 2 center facets)
    faces.push({
      index: fIdx,
      name: tmpl.name,
      oppositeFaceIndex: tmpl.oppositeIndex,
      normal: unitNormal,
      vertices: faceVerts,
      facets: faceFacets,
    });
  }

  // Assign stickerIndexInPiece for each piece's facets across all faces
  const pieceCounts: Record<string, number> = {};
  for (const face of faces) {
    for (const facet of face.facets) {
      const key = `${facet.pieceType}-${facet.pieceIndex}`;
      facet.stickerIndexInPiece = pieceCounts[key] || 0;
      pieceCounts[key] = (pieceCounts[key] || 0) + 1;
    }
  }

  return faces;
}

// Cached face geometry
export const DODECA_FACES = generateDodecahedronFaces();

// Quick lookup: find facet by face index and facet index
export function getFacet(faceIndex: number, facetIndex: number): FacetDefinition | undefined {
  return DODECA_FACES[faceIndex]?.facets[facetIndex];
}

// Hex color definitions for UI rendering and Three.js materials
export const COLOR_MAP: Record<PuzzleColor, string> = {
  white: '#FFFFFF',
  yellow: '#FACC15',
  blue: '#2563EB',
  green: '#16A34A',
  red: '#DC2626',
  orange: '#EA580C',
  purple: '#9333EA',
  pink: '#EC4899',
  cyan: '#06B6D4',
  lime: '#84CC16',
  silver: '#94A3B8',
  amber: '#D97706',
};
