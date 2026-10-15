/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COLOR_MAP, CUT_PLANES, DODECA_FACES, FACE_TEMPLATES } from '../logic/geometry';
import { FLAT_FACETS } from '../logic/skewbState';
import { MoveName, PuzzleColor } from '../types/puzzle';
import { sfx } from '../utils/audio';
import { RotateCcw, Eye, Compass, Sparkles, Hash } from 'lucide-react';

interface SkewbViewer3DProps {
  stickers: PuzzleColor[];
  selectedColor?: PuzzleColor;
  isPaintingMode: boolean;
  onFacetClick?: (flatIndex: number) => void;
  onApplyMove?: (move: MoveName) => void;
  hoveredFlatIndex?: number | null;
  onHoverFacet?: (flatIndex: number | null) => void;
  animatingMove: MoveName | null;
  animationProgress: number;
  onMoveComplete?: () => void;
  animDurationMs?: number;
  colorMap?: Record<string, string>;
  showFaceNumbers?: boolean;
  onToggleFaceNumbers?: () => void;
  focusFace?: { faceIndex: number; timestamp: number } | null;
  onFocusFaceComplete?: () => void;
}

// Create crisp high-DPI canvas texture for 3D face number badges
function createFaceBadgeTexture(faceNumber: number, code: string, isHighlighted = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.clearRect(0, 0, 256, 256);

  // Outer circular glow
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 112, 0, Math.PI * 2);
  ctx.fillStyle = isHighlighted ? 'rgba(79, 70, 229, 0.96)' : 'rgba(15, 23, 42, 0.92)';
  ctx.shadowColor = isHighlighted ? 'rgba(129, 140, 248, 0.95)' : 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = isHighlighted ? 24 : 14;
  ctx.fill();

  // Border ring
  ctx.lineWidth = isHighlighted ? 12 : 9;
  ctx.strokeStyle = isHighlighted ? '#e0e7ff' : '#6366f1';
  ctx.stroke();

  // Inner accent ring
  ctx.beginPath();
  ctx.arc(128, 128, 98, 0, Math.PI * 2);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = isHighlighted ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.3)';
  ctx.stroke();

  // Top header: "FACE"
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isHighlighted ? '#ffffff' : '#c7d2fe';
  ctx.font = 'bold 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText('FACE', 128, 64);

  // Big face number text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(String(faceNumber), 128, 124);

  // Sub-label (face code, e.g. TF, BB, LB, LF)
  ctx.fillStyle = isHighlighted ? '#ffffff' : '#a5b4fc';
  ctx.font = 'bold 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(code, 128, 184);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const SkewbViewer3D: React.FC<SkewbViewer3DProps> = ({
  stickers,
  isPaintingMode,
  onFacetClick,
  onApplyMove,
  hoveredFlatIndex = null,
  onHoverFacet,
  animatingMove,
  onMoveComplete,
  animDurationMs = 260,
  colorMap,
  showFaceNumbers: showFaceNumbersProp,
  onToggleFaceNumbers,
  focusFace,
  onFocusFaceComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const puzzleRootGroupRef = useRef<THREE.Group | null>(null);
  const pivotGroupRef = useRef<THREE.Group | null>(null);
  const staticGroupRef = useRef<THREE.Group | null>(null);

  // References to the 48 facet tile groups (backing + sticker + outline)
  const facetTileGroupsRef = useRef<THREE.Group[]>([]);
  // References to the 48 sticker meshes (for raycasting and color updates)
  const facetMeshesRef = useRef<THREE.Mesh[]>([]);

  // References to the 12 face number badge sprites
  const faceNumbersGroupRef = useRef<THREE.Group | null>(null);
  const faceSpritesRef = useRef<THREE.Sprite[]>([]);

  // Face numbers toggle state
  const [internalShowFaceNumbers, setInternalShowFaceNumbers] = useState(true);
  const showFaceNumbers = showFaceNumbersProp !== undefined ? showFaceNumbersProp : internalShowFaceNumbers;
  const toggleFaceNumbers = onToggleFaceNumbers || (() => setInternalShowFaceNumbers((prev) => !prev));

  // Ref to store onMoveComplete callback and avoid stale closures
  const onMoveCompleteRef = useRef(onMoveComplete);
  useEffect(() => {
    onMoveCompleteRef.current = onMoveComplete;
  }, [onMoveComplete]);

  const onApplyMoveRef = useRef(onApplyMove);
  useEffect(() => {
    onApplyMoveRef.current = onApplyMove;
  }, [onApplyMove]);

  const hoveredFacetRef = useRef<number | null>(null);
  const [hoveredFacetId, setHoveredFacetId] = useState<number | null>(null);

  const [showAxes, setShowAxes] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const axesGroupRef = useRef<THREE.Group | null>(null);

  const animStateRef = useRef<{
    active: boolean;
    move: MoveName;
    startTime: number;
    duration: number;
    axis: THREE.Vector3;
    targetAngle: number;
  } | null>(null);

  const cameraAnimRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number;
    startDistance: number;
    targetDistance: number;
    qStart: THREE.Quaternion;
    qTarget: THREE.Quaternion;
  } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712'); // Deep obsidian background
    sceneRef.current = scene;

    // Position camera looking directly at the oriented puzzle
    // (Top corner is up, Left corner is left, Right corner is right)
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.9, 5.0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.2;
    controls.maxDistance = 10.0;
    controlsRef.current = controls;

    // Clean neutral studio lighting setup (pure white 0xffffff, no colored casts)
    // High ambient fill ensures all 12 dodecahedron faces show accurate sticker colors
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.88);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.45);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-6, -4, 4);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.30);
    backLight.position.set(0, -7, -7);
    scene.add(backLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, 0.25);
    frontLight.position.set(0, 5, 6);
    scene.add(frontLight);

    // Root puzzle group oriented so that Axis U is at the physical Top (+Y),
    // Axis L is on the Left (-X), Axis R is on the Right (+X), and Axis B is in the Back (-Z)
    const puzzleRootGroup = new THREE.Group();
    puzzleRootGroup.rotation.set((-144.74 * Math.PI) / 180, 0, (-135.0 * Math.PI) / 180);
    scene.add(puzzleRootGroup);
    puzzleRootGroupRef.current = puzzleRootGroup;

    // Root groups for static and rotating pieces inside puzzleRootGroup
    const staticGroup = new THREE.Group();
    const pivotGroup = new THREE.Group();
    puzzleRootGroup.add(staticGroup);
    puzzleRootGroup.add(pivotGroup);
    staticGroupRef.current = staticGroup;
    pivotGroupRef.current = pivotGroup;

    // Optional Axes indicator group
    const axesGroup = new THREE.Group();
    axesGroup.visible = showAxes;
    puzzleRootGroup.add(axesGroup);
    axesGroupRef.current = axesGroup;

    CUT_PLANES.forEach((plane) => {
      const dir = new THREE.Vector3(...plane.normal).normalize();
      const arrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 2.2, 0x6366f1, 0.25, 0.15);
      axesGroup.add(arrow);
    });

    // Material for the black plastic backing of puzzle piece tiles
    const blackBackingMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0c101d'), // Rich dark puzzle plastic
      roughness: 0.65,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });

    const stickerMeshes: THREE.Mesh[] = [];
    const tileGroups: THREE.Group[] = [];

    // Build the 48 facet tiles (each facet has its dark backing tile, inset sticker, and perimeter outline)
    FLAT_FACETS.forEach((fInfo, idx) => {
      const face = DODECA_FACES[fInfo.faceIndex];
      const facetDef = face?.facets[fInfo.facetIndexInFace];
      if (!facetDef) return;

      const poly = facetDef.vertices;
      const normal = new THREE.Vector3(...facetDef.normal);
      const centroid = new THREE.Vector3(...facetDef.centroid);

      const tileGroup = new THREE.Group();
      tileGroup.userData = { flatIndex: idx, centroid: facetDef.centroid, normal: facetDef.normal };

      // 1. Black Plastic Backing Tile (Full polygon facet)
      const backGeom = new THREE.BufferGeometry();
      const backPos: number[] = [];
      const backNorm: number[] = [];
      for (let i = 1; i < poly.length - 1; i++) {
        backPos.push(
          poly[0][0], poly[0][1], poly[0][2],
          poly[i][0], poly[i][1], poly[i][2],
          poly[i + 1][0], poly[i + 1][1], poly[i + 1][2]
        );
        for (let k = 0; k < 3; k++) {
          backNorm.push(normal.x, normal.y, normal.z);
        }
      }
      backGeom.setAttribute('position', new THREE.Float32BufferAttribute(backPos, 3));
      backGeom.setAttribute('normal', new THREE.Float32BufferAttribute(backNorm, 3));
      backGeom.computeVertexNormals();

      const backMesh = new THREE.Mesh(backGeom, blackBackingMat);
      tileGroup.add(backMesh);

      // 2. Glossy Raised Sticker (Inset by 12% towards centroid, lifted by +0.02 along normal)
      const insetFactor = 0.88;
      const stickerVerts: THREE.Vector3[] = poly.map((v) => {
        const pt = new THREE.Vector3(...v);
        const pInset = pt.clone().sub(centroid).multiplyScalar(insetFactor).add(centroid);
        return pInset.add(normal.clone().multiplyScalar(0.02));
      });

      const stickerGeom = new THREE.BufferGeometry();
      const stickerPos: number[] = [];
      const stickerNorm: number[] = [];
      for (let i = 1; i < stickerVerts.length - 1; i++) {
        stickerPos.push(
          stickerVerts[0].x, stickerVerts[0].y, stickerVerts[0].z,
          stickerVerts[i].x, stickerVerts[i].y, stickerVerts[i].z,
          stickerVerts[i + 1].x, stickerVerts[i + 1].y, stickerVerts[i + 1].z
        );
        for (let k = 0; k < 3; k++) {
          stickerNorm.push(normal.x, normal.y, normal.z);
        }
      }
      stickerGeom.setAttribute('position', new THREE.Float32BufferAttribute(stickerPos, 3));
      stickerGeom.setAttribute('normal', new THREE.Float32BufferAttribute(stickerNorm, 3));
      stickerGeom.computeVertexNormals();

      const initialColor =
        (colorMap && colorMap[stickers[idx]]) ||
        COLOR_MAP[stickers[idx] || fInfo.defaultColor12] ||
        '#FFFFFF';
      const stickerMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(initialColor),
        roughness: 0.35,
        metalness: 0.0,
        side: THREE.DoubleSide,
      });

      const stickerMesh = new THREE.Mesh(stickerGeom, stickerMat);
      stickerMesh.userData = { flatIndex: idx, centroid: facetDef.centroid, normal: facetDef.normal };
      tileGroup.add(stickerMesh);
      stickerMeshes[idx] = stickerMesh;

      // 3. Crisp Die-Cut Outline Border (slightly raised to +0.024)
      const linePts = [...stickerVerts, stickerVerts[0]].map((p) =>
        p.clone().add(normal.clone().multiplyScalar(0.003))
      );
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0x020617, linewidth: 2 });
      const line = new THREE.Line(lineGeom, lineMat);
      tileGroup.add(line);

      staticGroup.add(tileGroup);
      tileGroups[idx] = tileGroup;
    });

    facetMeshesRef.current = stickerMeshes;
    facetTileGroupsRef.current = tileGroups;

    // Compact interior core sphere (radius 1.15) to seal the inside
    const coreGeom = new THREE.IcosahedronGeometry(1.15, 2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x05070e });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    staticGroup.add(coreMesh);

    // 12 Face Number Badges (1–12) positioned at each face centroid
    const faceNumbersGroup = new THREE.Group();
    faceNumbersGroup.visible = showFaceNumbers;
    puzzleRootGroup.add(faceNumbersGroup);
    faceNumbersGroupRef.current = faceNumbersGroup;

    const sprites: THREE.Sprite[] = [];
    DODECA_FACES.forEach((face, fIdx) => {
      const tmpl = FACE_TEMPLATES[fIdx];
      const code = tmpl.name.match(/\((.*?)\)/)?.[1] || `F${fIdx + 1}`;

      let cX = 0,
        cY = 0,
        cZ = 0;
      face.vertices.forEach((v) => {
        cX += v[0];
        cY += v[1];
        cZ += v[2];
      });
      const n = face.vertices.length || 1;
      const centroid = [cX / n, cY / n, cZ / n];
      const normal = face.normal;

      const texture = createFaceBadgeTexture(fIdx + 1, code, false);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        depthTest: true,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.56, 0.56, 1.0);
      sprite.position.set(
        centroid[0] + normal[0] * 0.08,
        centroid[1] + normal[1] * 0.08,
        centroid[2] + normal[2] * 0.08
      );
      sprite.userData = { faceIndex: fIdx, faceNumber: fIdx + 1, code };
      faceNumbersGroup.add(sprite);
      sprites[fIdx] = sprite;
    });
    faceSpritesRef.current = sprites;

    // Animation render loop
    let reqId: number;
    const animate = (time: number) => {
      reqId = requestAnimationFrame(animate);

      // Handle ongoing physical move twist
      if (animStateRef.current && animStateRef.current.active) {
        const { startTime, duration, targetAngle, axis } = animStateRef.current;
        const elapsed = time - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / duration));

        // Smooth cubic ease-in-out curve
        const ease =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        const currentAngle = targetAngle * ease;

        if (pivotGroupRef.current) {
          pivotGroupRef.current.rotation.set(0, 0, 0);
          pivotGroupRef.current.rotateOnAxis(axis, currentAngle);
        }

        if (progress >= 1) {
          // Finished move animation
          animStateRef.current.active = false;
          sfx.playClick(1.05);

          // Return all 24 tiles from pivotGroup back to staticGroup
          if (pivotGroupRef.current && staticGroupRef.current) {
            while (pivotGroupRef.current.children.length > 0) {
              const child = pivotGroupRef.current.children[0];
              staticGroupRef.current.add(child);
            }
            pivotGroupRef.current.rotation.set(0, 0, 0);
          }

          // Trigger state update via non-stale callback ref
          if (onMoveCompleteRef.current) {
            onMoveCompleteRef.current();
          }
        }
      }

      // Handle smooth camera centering transition to focused face
      if (cameraAnimRef.current && cameraAnimRef.current.active) {
        const { startTime, duration, startDistance, targetDistance, qStart, qTarget } = cameraAnimRef.current;
        const elapsed = time - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / duration));

        // Smooth cubic ease-out curve
        const ease = 1 - Math.pow(1 - progress, 3);
        const curQ = qStart.clone().slerp(qTarget, ease);
        const curDir = new THREE.Vector3(0, 0, 1).applyQuaternion(curQ);
        const curDist = startDistance + (targetDistance - startDistance) * ease;

        if (cameraRef.current && controlsRef.current) {
          cameraRef.current.position.copy(curDir.multiplyScalar(curDist));
          controlsRef.current.target.set(0, 0, 0);
          cameraRef.current.lookAt(0, 0, 0);
        }

        if (progress >= 1) {
          cameraAnimRef.current.active = false;
        }
      }

      if (autoRotate && controlsRef.current && (!cameraAnimRef.current || !cameraAnimRef.current.active)) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 1.4;
      } else if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    reqId = requestAnimationFrame(animate);

    // Handle container resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(reqId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Update showAxes visibility
  useEffect(() => {
    if (axesGroupRef.current) {
      axesGroupRef.current.visible = showAxes;
    }
  }, [showAxes]);

  // Update face numbers visibility
  useEffect(() => {
    if (faceNumbersGroupRef.current) {
      faceNumbersGroupRef.current.visible = showFaceNumbers;
    }
  }, [showFaceNumbers]);

  // Synchronize hover state and focus state to highlight active face number badge
  useEffect(() => {
    const activeFaceIdx =
      hoveredFlatIndex !== null && FLAT_FACETS[hoveredFlatIndex]
        ? FLAT_FACETS[hoveredFlatIndex].faceIndex
        : focusFace && typeof focusFace.faceIndex === 'number'
        ? focusFace.faceIndex
        : null;

    faceSpritesRef.current.forEach((sprite, fIdx) => {
      if (!sprite) return;
      if (activeFaceIdx === fIdx) {
        sprite.scale.set(0.70, 0.70, 1.0);
      } else {
        sprite.scale.set(0.56, 0.56, 1.0);
      }
    });
  }, [hoveredFlatIndex, focusFace]);

  // Smoothly rotate 3D camera to center requested face
  const rotateToCenterFace = useCallback((faceIndex: number) => {
    if (!cameraRef.current || !puzzleRootGroupRef.current) return;
    const face = DODECA_FACES[faceIndex];
    if (!face) return;

    // Face normal in local space
    const normalLocal = new THREE.Vector3(...face.normal);
    // Face normal in world space after puzzleRootGroup rotation
    const normalWorld = normalLocal.clone().applyQuaternion(puzzleRootGroupRef.current.quaternion).normalize();

    const currentPos = cameraRef.current.position.clone();
    const currentDistance = currentPos.length() || 5.08;
    const targetDistance = Math.min(Math.max(currentDistance, 3.8), 6.5);

    const v0 = currentPos.clone().normalize();
    const v1 = normalWorld.clone();

    const dot = Math.max(-1, Math.min(1, v0.dot(v1)));
    if (dot > 0.9998) {
      // Already centered on this face
      return;
    }

    const qStart = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v0);
    const qTarget = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v1);

    setAutoRotate(false); // Disable auto-rotate when a face is intentionally focused

    cameraAnimRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 440,
      startDistance: currentDistance,
      targetDistance,
      qStart,
      qTarget,
    };
  }, []);

  // Trigger camera rotation whenever focusFace prop updates
  useEffect(() => {
    if (focusFace && typeof focusFace.faceIndex === 'number') {
      rotateToCenterFace(focusFace.faceIndex);
    }
  }, [focusFace, rotateToCenterFace]);

  // Update sticker colors whenever stickers or colorMap prop updates
  useEffect(() => {
    facetMeshesRef.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const color = stickers[idx];
      const hex = (colorMap && colorMap[color]) || COLOR_MAP[color] || '#ffffff';
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.set(hex);
      }
    });
  }, [stickers, colorMap]);

  // Synchronize external hover (from 2D net) onto 3D facet meshes
  useEffect(() => {
    facetMeshesRef.current.forEach((mesh, idx) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      if (hoveredFlatIndex === idx) {
        mat.emissive.setHex(0x4f46e5); // Luminous indigo
      } else {
        mat.emissive.setHex(0x000000);
      }
    });
  }, [hoveredFlatIndex]);

  // Handle animation trigger from parent when animatingMove changes
  useEffect(() => {
    if (!animatingMove) return;

    // Find plane index for the move
    const planeName = animatingMove[0];
    const isClockwise = !animatingMove.includes("'");
    const planeIdx = CUT_PLANES.findIndex((p) => p.name === planeName);
    if (planeIdx === -1) return;

    const planeNormal = CUT_PLANES[planeIdx].normal;
    const axisVec = new THREE.Vector3(...planeNormal).normalize();
    const angle = (isClockwise ? 1 : -1) * ((2 * Math.PI) / 3);

    // Reparent the 24 facet tiles on the positive side of the plane into pivotGroup
    if (pivotGroupRef.current && staticGroupRef.current) {
      // First ensure any previous tiles are safely returned to staticGroup
      while (pivotGroupRef.current.children.length > 0) {
        const child = pivotGroupRef.current.children[0];
        staticGroupRef.current.add(child);
      }
      pivotGroupRef.current.rotation.set(0, 0, 0);

      facetTileGroupsRef.current.forEach((tileGroup) => {
        if (!tileGroup) return;
        const centroid = tileGroup.userData.centroid as [number, number, number];
        const dotVal =
          centroid[0] * planeNormal[0] +
          centroid[1] * planeNormal[1] +
          centroid[2] * planeNormal[2];
        if (dotVal > 0.02) {
          pivotGroupRef.current!.add(tileGroup);
        }
      });
    }

    sfx.playClick(0.95);
    animStateRef.current = {
      active: true,
      move: animatingMove,
      startTime: performance.now(),
      duration: animDurationMs,
      axis: axisVec,
      targetAngle: angle,
    };
  }, [animatingMove, animDurationMs]);

  // Raycaster for hover and click interaction
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

      if (cameraAnimRef.current) {
        cameraAnimRef.current.active = false;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const intersects = raycaster.intersectObjects(facetMeshesRef.current, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const fIdx = hit.userData.flatIndex as number;

        if (isPaintingMode && onFacetClick) {
          // In paint mode, paint the clicked facet
          sfx.playClick(1.2);
          onFacetClick(fIdx);
        } else if (!isPaintingMode && onApplyMoveRef.current) {
          // In play mode, clicking on a piece twists that layer
          const centroid = hit.userData.centroid as [number, number, number];
          let bestPlane = 'U';
          let maxDot = -Infinity;

          CUT_PLANES.forEach((plane) => {
            const d =
              centroid[0] * plane.normal[0] +
              centroid[1] * plane.normal[1] +
              centroid[2] * plane.normal[2];
            if (d > maxDot) {
              maxDot = d;
              bestPlane = plane.name;
            }
          });

          const isCCW = e.shiftKey || e.button === 2;
          const moveName = (isCCW ? `${bestPlane}'` : bestPlane) as MoveName;
          onApplyMoveRef.current(moveName);
        }
      }
    },
    [isPaintingMode, onFacetClick]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const intersects = raycaster.intersectObjects(facetMeshesRef.current, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const fIdx = hit.userData.flatIndex as number;

        if (hoveredFacetRef.current !== fIdx) {
          // Reset previous hover emissive
          if (hoveredFacetRef.current !== null) {
            const prevMesh = facetMeshesRef.current[hoveredFacetRef.current];
            if (prevMesh) {
              (prevMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
            }
          }

          hoveredFacetRef.current = fIdx;
          setHoveredFacetId(fIdx);
          if (onHoverFacet) onHoverFacet(fIdx);

          // Highlight new hovered facet
          (hit.material as THREE.MeshStandardMaterial).emissive.setHex(0x4338ca);
        }
      } else {
        if (hoveredFacetRef.current !== null) {
          const prevMesh = facetMeshesRef.current[hoveredFacetRef.current];
          if (prevMesh) {
            (prevMesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
          }
          hoveredFacetRef.current = null;
          setHoveredFacetId(null);
          if (onHoverFacet) onHoverFacet(null);
        }
      }
    },
    [onHoverFacet]
  );

  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const currentPos = cameraRef.current.position.clone();
    const currentDistance = currentPos.length() || 5.08;
    const v0 = currentPos.clone().normalize();
    const v1 = new THREE.Vector3(0, 0.9, 5.0).normalize();
    const qStart = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v0);
    const qTarget = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v1);

    setAutoRotate(false);
    cameraAnimRef.current = {
      active: true,
      startTime: performance.now(),
      duration: 380,
      startDistance: currentDistance,
      targetDistance: 5.08,
      qStart,
      qTarget,
    };
  };

  return (
    <div className="relative w-full h-full min-h-[460px] lg:min-h-[580px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col">
      {/* 3D Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        className={`w-full h-full flex-1 ${
          isPaintingMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Floating 3D Viewport Controls HUD */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-xl shadow-lg">
        <button
          onClick={toggleFaceNumbers}
          title={showFaceNumbers ? 'Hide Face Numbers (1–12)' : 'Show Face Numbers (1–12)'}
          className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold ${
            showFaceNumbers
              ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/50 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/90'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>Face #</span>
        </button>
        <button
          onClick={resetCamera}
          title="Reset View (Top Corner Facing Up)"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/90 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Showcase Auto-Spin"
          className={`p-2 rounded-lg transition-colors ${
            autoRotate
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/90'
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowAxes(!showAxes)}
          title="Toggle Rotation Axes"
          className={`p-2 rounded-lg transition-colors ${
            showAxes
              ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/90'
          }`}
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Interactive Helper Overlay Info */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-lg text-xs text-slate-300">
        <Eye className="w-3.5 h-3.5 text-indigo-400" />
        {isPaintingMode ? (
          <span>Click any sticker in 3D to paint with active color</span>
        ) : (
          <span>Click on corners in 3D or use buttons below to twist</span>
        )}
        {showFaceNumbers && (
          <span className="text-[11px] text-indigo-300 font-mono hidden sm:inline">
            · Face #1–12 labeled
          </span>
        )}
      </div>

      {/* Active hover info */}
      {hoveredFacetId !== null && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-indigo-950/90 backdrop-blur-md border border-indigo-800/80 rounded-lg text-xs font-medium text-indigo-200">
          Facet #{hoveredFacetId} (Face {FLAT_FACETS[hoveredFacetId]?.faceIndex + 1}) · {FLAT_FACETS[hoveredFacetId]?.pieceType}
        </div>
      )}
    </div>
  );
};
