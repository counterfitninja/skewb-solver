/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { COLOR_MAP, DODECA_FACES, FACE_TEMPLATES } from '../logic/geometry';
import { FLAT_FACETS } from '../logic/skewbState';
import { PuzzleColor } from '../types/puzzle';

interface UnfoldedNetProps {
  stickers: PuzzleColor[];
  selectedColor?: PuzzleColor;
  isPaintingMode: boolean;
  onFacetClick?: (flatIndex: number) => void;
  hoveredFlatIndex?: number | null;
  onHoverFacet?: (flatIndex: number | null) => void;
  mode: '6-color' | '12-color';
  colorMap?: Record<string, string>;
}

export const UnfoldedNet: React.FC<UnfoldedNetProps> = ({
  stickers,
  isPaintingMode,
  onFacetClick,
  hoveredFlatIndex,
  onHoverFacet,
  mode,
  colorMap,
}) => {
  // Render each of the 12 faces as an SVG pentagon containing its 4 facets projected to 2D
  return (
    <div className="w-full bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">2D Unfolded Surface Net</h3>
          <p className="text-xs text-slate-400">
            View all 12 pentagons and 48 stickers simultaneously. {isPaintingMode && 'Click any facet to paint.'}
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400 tabular-nums">
          12 Faces · 48 Stickers ({mode})
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {DODECA_FACES.map((face, fIdx) => {
          const tmpl = FACE_TEMPLATES[fIdx];
          const unitNormal = face.normal;

          // 2D Projection: create a coordinate frame on the face plane
          // u = arbitrary perpendicular vector on plane
          // v = normal x u
          const u = face.vertices.length > 0
            ? [
                face.vertices[0][0] - face.vertices[2][0],
                face.vertices[0][1] - face.vertices[2][1],
                face.vertices[0][2] - face.vertices[2][2],
              ]
            : [1, 0, 0];
          const uLen = Math.hypot(u[0], u[1], u[2]) || 1;
          const uUnit = [u[0] / uLen, u[1] / uLen, u[2] / uLen];
          const vUnit = [
            unitNormal[1] * uUnit[2] - unitNormal[2] * uUnit[1],
            unitNormal[2] * uUnit[0] - unitNormal[0] * uUnit[2],
            unitNormal[0] * uUnit[1] - unitNormal[1] * uUnit[0],
          ];

          // Compute face centroid for 2D origin
          let cX = 0, cY = 0, cZ = 0;
          face.vertices.forEach((p) => {
            cX += p[0];
            cY += p[1];
            cZ += p[2];
          });
          const count = face.vertices.length || 1;
          const center = [cX / count, cY / count, cZ / count];

          // Helper to project 3D point to 2D SVG canvas (size 100x100, center at 50,50)
          const project2D = (p: [number, number, number]): [number, number] => {
            const rel = [p[0] - center[0], p[1] - center[1], p[2] - center[2]];
            const px = rel[0] * uUnit[0] + rel[1] * uUnit[1] + rel[2] * uUnit[2];
            const py = rel[0] * vUnit[0] + rel[1] * vUnit[1] + rel[2] * vUnit[2];
            // Scale by ~48 to fill viewBox
            return [50 + px * 46, 50 - py * 46];
          };

          const pentagonPoints = face.vertices.map(project2D).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

          return (
            <div
              key={face.index}
              className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 flex flex-col items-center hover:border-slate-700 transition-colors"
            >
              <div className="w-full flex items-center justify-between text-[11px] mb-2 px-1">
                <span className="font-semibold text-slate-200">Face {fIdx + 1}</span>
                <span className="text-slate-400 font-mono text-[10px]">{tmpl.name.split(' ')[0]}</span>
              </div>

              {/* Pentagon SVG with 4 facets */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
                  {/* Outer Pentagon Border / Black plastic body */}
                  <polygon
                    points={pentagonPoints}
                    fill="#0f172a"
                    stroke="#1e293b"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />

                  {/* 4 Facet Stickers */}
                  {face.facets.map((facet) => {
                    const flatIdx = FLAT_FACETS.findIndex(
                      (fl) => fl.faceIndex === fIdx && fl.facetIndexInFace === facet.facetIndexInFace
                    );
                    const currentColor = stickers[flatIdx] || 'white';
                    const fillHex = (colorMap && colorMap[currentColor]) || COLOR_MAP[currentColor] || '#ffffff';
                    const isHovered = hoveredFlatIndex === flatIdx;

                    // Inset polygon slightly for realistic sticker border
                    const facet2D = facet.vertices.map(project2D);
                    let fCenter = [0, 0];
                    facet2D.forEach(([x, y]) => {
                      fCenter[0] += x;
                      fCenter[1] += y;
                    });
                    fCenter[0] /= facet2D.length;
                    fCenter[1] /= facet2D.length;

                    const insetPts = facet2D
                      .map(([x, y]) => {
                        const ix = fCenter[0] + (x - fCenter[0]) * 0.90;
                        const iy = fCenter[1] + (y - fCenter[1]) * 0.90;
                        return `${ix.toFixed(1)},${iy.toFixed(1)}`;
                      })
                      .join(' ');

                    return (
                      <polygon
                        key={`net-face-${fIdx}-flat-${flatIdx}`}
                        points={insetPts}
                        fill={fillHex}
                        stroke={isHovered ? '#6366f1' : '#020617'}
                        strokeWidth={isHovered ? '2.5' : '1.2'}
                        strokeLinejoin="round"
                        onClick={() => onFacetClick && onFacetClick(flatIdx)}
                        onPointerEnter={() => onHoverFacet && onHoverFacet(flatIdx)}
                        onPointerLeave={() => onHoverFacet && onHoverFacet(null)}
                        className={`transition-all duration-150 ${
                          isPaintingMode
                            ? 'cursor-pointer hover:opacity-90 hover:stroke-white'
                            : 'cursor-default'
                        }`}
                      >
                        <title>
                          {facet.pieceType} sticker · Flat #{flatIdx} ({currentColor})
                        </title>
                      </polygon>
                    );
                  })}
                </svg>
              </div>

              <div className="mt-2 text-[10px] text-slate-400 font-mono">
                Opp: #{tmpl.oppositeIndex + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
