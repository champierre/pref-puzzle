import type { MeshGenerationParams, TriangleSoup } from '../types';
import earcut from 'earcut';

function signedArea(pts: [number, number][]): number {
  let area = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    area += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
  }
  return area / 2;
}

function quadraticBezier(p0: [number, number], p1: [number, number], p2: [number, number], steps: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0];
    const y = (1 - t) * (1 - t) * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1];
    pts.push([x, y]);
  }
  return pts;
}

function cubicBezier(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], steps: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
    const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
    pts.push([x, y]);
  }
  return pts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pathToContours(path: any, curveSteps: number): [number, number][][] {
  const contours: [number, number][][] = [];
  let current: [number, number][] = [];
  let cx = 0, cy = 0;
  for (const cmd of path.commands) {
    if (cmd.type === 'M') {
      if (current.length > 2) contours.push(current);
      current = [[cmd.x, cmd.y]];
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'L') {
      current.push([cmd.x, cmd.y]);
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'Q') {
      const pts = quadraticBezier([cx, cy], [cmd.x1, cmd.y1], [cmd.x, cmd.y], curveSteps);
      current.push(...pts.slice(1));
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'C') {
      const pts = cubicBezier([cx, cy], [cmd.x1, cmd.y1], [cmd.x2, cmd.y2], [cmd.x, cmd.y], curveSteps);
      current.push(...pts.slice(1));
      cx = cmd.x; cy = cmd.y;
    } else if (cmd.type === 'Z') {
      if (current.length > 2) contours.push(current);
      current = [];
      cx = 0; cy = 0;
    }
  }
  if (current.length > 2) contours.push(current);
  return contours;
}

export async function buildTextMesh(
  text: string,
  fontBuffer: ArrayBuffer,
  centerX: number,
  centerY: number,
  baseZ: number,
  params: MeshGenerationParams,
): Promise<TriangleSoup | null> {
  if (params.textMode === 'none') return null;
  // Dynamic import to avoid SSR issues
  const opentype = await import('opentype.js');
  const font = opentype.parse(fontBuffer);

  const fontSize = params.fontSize * params.xyScale;
  const curveSteps = Math.max(4, Math.round(fontSize * 50000 / 20));
  const textDepthWorld = params.textDepth * params.xyScale;
  const dir = params.textMode === 'emboss' ? 1 : -1;

  // Lay out characters horizontally
  let xOffset = 0;
  const glyphs: Array<{ contours: [number, number][][]; advance: number }> = [];
  let totalWidth = 0;
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const path = glyph.getPath(0, 0, fontSize);
    const advance = (glyph.advanceWidth ?? 0) * fontSize / font.unitsPerEm;
    const contours = pathToContours(path, curveSteps);
    glyphs.push({ contours, advance });
    totalWidth += advance;
  }

  const startX = centerX - totalWidth / 2;
  const posArr: number[] = [];
  const normArr: number[] = [];

  for (const { contours, advance } of glyphs) {
    // Y negate (opentype Y-down → world Y-up)
    const flipped: [number, number][][] = contours.map(ring =>
      ring.map(([x, y]) => [startX + xOffset + x, centerY - y])
    );

    const outers: [number, number][][] = [];
    const holes: [number, number][][] = [];
    for (const ring of flipped) {
      if (signedArea(ring) >= 0) outers.push(ring); else holes.push(ring);
    }

    for (const outer of outers) {
      const ringsForEarcut: [number, number][][] = [outer];
      for (const hole of holes) ringsForEarcut.push(hole);

      const flatVerts: number[] = [];
      const holeIndices: number[] = [];
      for (let ri = 0; ri < ringsForEarcut.length; ri++) {
        if (ri > 0) holeIndices.push(flatVerts.length / 2);
        for (const [x, y] of ringsForEarcut[ri]) flatVerts.push(x, y);
      }

      const indices = earcut(flatVerts, holeIndices, 2);
      const topZ = baseZ + dir * textDepthWorld;

      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 2, i1 = indices[i + 1] * 2, i2 = indices[i + 2] * 2;
        posArr.push(flatVerts[i0], flatVerts[i0 + 1], topZ);
        posArr.push(flatVerts[i1], flatVerts[i1 + 1], topZ);
        posArr.push(flatVerts[i2], flatVerts[i2 + 1], topZ);
        normArr.push(0, 0, dir, 0, 0, dir, 0, 0, dir);
      }
    }
    xOffset += advance;
  }

  if (posArr.length === 0) return null;
  return {
    positions: new Float32Array(posArr),
    normals: new Float32Array(normArr),
    triangleCount: posArr.length / 9,
  };
}
