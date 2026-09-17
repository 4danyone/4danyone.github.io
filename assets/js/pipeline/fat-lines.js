/**
 * Lines with an actual width.
 *
 * WebGL ignores `linewidth` on `LineBasicMaterial` — every line is one device
 * pixel, which on a 2x display is half a CSS pixel and reads as a scratch. That
 * is not a small cosmetic problem here: the frustum wireframes and the skeleton
 * are most of what this scene draws.
 *
 * three.js solves it in `examples/jsm` with Line2 / LineMaterial, which is
 * another four files on top of the two already vendored. The technique is not
 * large, so it is here instead: each segment becomes a quad whose corners are
 * pushed perpendicular to the segment *in screen space*, so the ribbon holds a
 * constant pixel width however far away it is.
 *
 * Segment endpoints are attributes rather than positions, which means a moving
 * skeleton updates two vec3 arrays per frame and never rebuilds geometry.
 */
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector2,
} from "../vendor/three.module.js";

const VERTEX = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute vec3 aColor;
  attribute vec2 aCorner;   // x: 0 at the start point, 1 at the end. y: which side.
  attribute float aWidthScale; // per-segment multiplier on uWidth, usually 1

  uniform vec2 uResolution;
  uniform float uWidth;     // half-width, in CSS pixels

  varying vec3 vColor;

  void main() {
    vColor = aColor;

    vec4 clipStart = projectionMatrix * modelViewMatrix * vec4(aStart, 1.0);
    vec4 clipEnd = projectionMatrix * modelViewMatrix * vec4(aEnd, 1.0);
    vec4 clip = mix(clipStart, clipEnd, aCorner.x);

    // Perpendicular in pixel space, so width does not shrink with distance.
    vec2 pxStart = (clipStart.xy / clipStart.w) * uResolution;
    vec2 pxEnd = (clipEnd.xy / clipEnd.w) * uResolution;
    vec2 along = pxEnd - pxStart;
    // A zero-length segment has no direction; normalize would hand back NaN and
    // take the whole quad with it.
    vec2 dir = length(along) > 1e-6 ? normalize(along) : vec2(1.0, 0.0);
    vec2 normal = vec2(-dir.y, dir.x);

    // Back to clip space: NDC spans two units across uResolution pixels, and
    // multiplying by w undoes the perspective divide that has not happened yet.
    clip.xy += (normal * aCorner.y * uWidth * aWidthScale / uResolution) * clip.w;
    gl_Position = clip;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, uOpacity);
  }
`;

/**
 * @param {number} count how many segments
 * @param {object} options
 * @param {number} [options.width] line width in CSS pixels
 */
export function createFatLines(count, { width = 2 } = {}) {
  const geometry = new BufferGeometry();
  const start = new Float32Array(count * 4 * 3);
  const end = new Float32Array(count * 4 * 3);
  const color = new Float32Array(count * 4 * 3);
  const corner = new Float32Array(count * 4 * 2);
  const index = new Uint32Array(count * 6);

  // Four corners per segment: (start, -1) (start, +1) (end, +1) (end, -1).
  const CORNERS = [
    [0, -1],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let i = 0; i < count; i += 1) {
    for (let c = 0; c < 4; c += 1) {
      corner[(i * 4 + c) * 2] = CORNERS[c][0];
      corner[(i * 4 + c) * 2 + 1] = CORNERS[c][1];
    }
    const base = i * 4;
    index.set([base, base + 1, base + 2, base, base + 2, base + 3], i * 6);
  }

  // Per-segment width, as a multiplier on the mesh-wide uniform rather than a
  // width of its own: every caller animates uWidth (bold on hover, and so on),
  // and a segment that opted out of that would be a bug, not a feature.
  const widthScale = new Float32Array(count * 4).fill(1);

  const startAttribute = new BufferAttribute(start, 3);
  const endAttribute = new BufferAttribute(end, 3);
  const colorAttribute = new BufferAttribute(color, 3);
  const widthScaleAttribute = new BufferAttribute(widthScale, 1);
  geometry.setAttribute("aStart", startAttribute);
  geometry.setAttribute("aEnd", endAttribute);
  geometry.setAttribute("aColor", colorAttribute);
  geometry.setAttribute("aWidthScale", widthScaleAttribute);
  geometry.setAttribute("aCorner", new BufferAttribute(corner, 2));
  // `position` is never read by the shader, but three.js needs one to compute a
  // bounding sphere, and frustum culling is off anyway.
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(count * 4 * 3), 3));
  geometry.setIndex(new BufferAttribute(index, 1));

  const material = new ShaderMaterial({
    uniforms: {
      uResolution: { value: new Vector2(1, 1) },
      uWidth: { value: width },
      uOpacity: { value: 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });

  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;

  return {
    mesh,
    material,

    /** Set one segment's endpoints. Call `commit()` once after a batch. */
    setSegment(i, ax, ay, az, bx, by, bz) {
      for (let c = 0; c < 4; c += 1) {
        const o = (i * 4 + c) * 3;
        start[o] = ax;
        start[o + 1] = ay;
        start[o + 2] = az;
        end[o] = bx;
        end[o + 1] = by;
        end[o + 2] = bz;
      }
    },

    setColor(i, r, g, b) {
      for (let c = 0; c < 4; c += 1) {
        const o = (i * 4 + c) * 3;
        color[o] = r;
        color[o + 1] = g;
        color[o + 2] = b;
      }
    },

    /** Scale one segment's width against the mesh's uWidth. Set once, at build. */
    setWidthScale(i, scale) {
      for (let c = 0; c < 4; c += 1) {
        widthScale[i * 4 + c] = scale;
      }
      widthScaleAttribute.needsUpdate = true;
    },

    commit() {
      startAttribute.needsUpdate = true;
      endAttribute.needsUpdate = true;
    },

    commitColors() {
      colorAttribute.needsUpdate = true;
    },

    setSize(width_, height_) {
      material.uniforms.uResolution.value.set(width_, height_);
    },

    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
