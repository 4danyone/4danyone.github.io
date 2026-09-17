/**
 * The visual-hull shell: a per-frame point cloud around the skeleton.
 *
 * These are the same hulls the 4D Gaussians were initialised from, carved from
 * the twenty-four generated views, so they already live in the skeleton's world
 * and needed no extra work to obtain — the first draft of the plan budgeted a
 * GPU run to produce a decimated SMPL mesh for this job, and that turned out to
 * be unnecessary.
 *
 * They earn their place by answering a question a bare stick figure raises: the
 * video model does not condition on a skeleton floating in a void, it produces
 * a *person*, and the ring of cameras is looking at a volume. A translucent
 * shell with the skeleton glowing through says that; twenty-eight line segments
 * alone do not.
 *
 * Positions arrive quantised to uint16 inside a shared bounding box, and the
 * point count varies per frame (marching cubes on a changing silhouette), which
 * is why the data carries per-frame offsets rather than a fixed stride.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
} from "../vendor/three.module.js";
import { NO_GLOW_LAYER } from "./bloom.js";
import { clamp } from "./math.js";

const POINT_SIZE = 0.013;

export async function loadHull(base) {
  const manifest = await fetch(`${base}/hull.json`).then((response) => {
    if (!response.ok) throw new Error(`${response.status} fetching hull.json`);
    return response.json();
  });
  const [positions, colors] = await Promise.all([
    fetchBuffer(`${base}/hull_positions.bin`, Uint16Array),
    fetchBuffer(`${base}/hull_colors.bin`, Uint8Array),
  ]);
  return { manifest, positions, colors };
}

async function fetchBuffer(url, Type) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching ${url}`);
  return new Type(await response.arrayBuffer());
}

export function createHull({ manifest, positions, colors }) {
  const { offsets, bounds } = manifest;
  const min = bounds.min;
  const scale = [
    (bounds.max[0] - min[0]) / 65535,
    (bounds.max[1] - min[1]) / 65535,
    (bounds.max[2] - min[2]) / 65535,
  ];

  // One buffer sized to the largest frame, re-filled each frame and drawn with
  // a draw range. Allocating per frame would churn the GPU for no reason, and a
  // buffer per frame would be a hundred-odd of them.
  let capacity = 0;
  for (let i = 0; i < offsets.length - 1; i += 1) {
    capacity = Math.max(capacity, offsets[i + 1] - offsets[i]);
  }

  const geometry = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(capacity * 3), 3);
  const color = new BufferAttribute(new Float32Array(capacity * 3), 3);
  position.setUsage(35048 /* DynamicDrawUsage */);
  color.setUsage(35048);
  geometry.setAttribute("position", position);
  geometry.setAttribute("color", color);

  const material = new PointsMaterial({
    size: POINT_SIZE,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.name = "hull";
  // Excluded from the glow with the video surfaces, not with the line work:
  // these carry the subject's real colours, so blooming them reads as haze
  // around the person rather than as legibility.
  points.layers.set(NO_GLOW_LAYER);

  function setFrame(frame) {
    const index = clamp(frame, 0, offsets.length - 2);
    const start = offsets[index];
    const count = offsets[index + 1] - start;

    for (let i = 0; i < count; i += 1) {
      const src = (start + i) * 3;
      position.array[i * 3] = min[0] + positions[src] * scale[0];
      position.array[i * 3 + 1] = min[1] + positions[src + 1] * scale[1];
      position.array[i * 3 + 2] = min[2] + positions[src + 2] * scale[2];
      color.array[i * 3] = colors[src] / 255;
      color.array[i * 3 + 1] = colors[src + 1] / 255;
      color.array[i * 3 + 2] = colors[src + 2] / 255;
    }
    position.needsUpdate = true;
    color.needsUpdate = true;
    geometry.setDrawRange(0, count);
  }

  /**
   * Kept low deliberately. The shell is context for the skeleton, not the
   * subject: bright enough to read as a body, dim enough that the coloured
   * bones stay the thing the eye lands on.
   */
  function setOpacity(value) {
    material.opacity = value * 0.32;
    points.visible = value > 0.002;
  }

  setFrame(0);
  setOpacity(0);

  return {
    points,
    setFrame,
    setOpacity,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
