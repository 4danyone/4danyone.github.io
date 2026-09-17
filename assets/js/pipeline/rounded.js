/**
 * Rounded rectangles, for the things in the scene that are pictures.
 *
 * Every framed image on the page has rounded corners — `--radius-media` is 28px
 * on the video and figure frames — and the scene had square ones, which made the
 * cameras' image rectangles the only hard corners anywhere. They read as a
 * different kind of object than the page they sit in.
 *
 * Three shapes rather than one, because a framed picture in this scene is drawn
 * twice: the picture itself is a filled surface, its frame is a line, and the
 * frustum's four rays have to land somewhere on that frame. All three have to
 * agree about where the corner is, so they come from one place with one radius.
 *
 * The radius is a share of the *shorter* side. Sharing the longer one puts a
 * portrait frame's corners a third of the way up its short edge and the shape
 * stops being a rectangle.
 */
import { Shape, ShapeGeometry } from "../vendor/three.module.js";

/**
 * Subdivisions per corner.
 *
 * Six rather than four. The corners are drawn as chords, so a facet is visible
 * at four once the edges are antialiased and there is nothing else for the eye
 * to blame — and 24 cameras times 8 extra segments is nothing next to what a
 * frustum already costs.
 */
const CORNER_STEPS = 6;

/** Share of the shorter side. Matches the handset's screen, which is the one
 *  rounded rectangle in the scene the reader can compare against a real object. */
const FRAME_RADIUS = 0.11;

/** @returns {number} the radius to use for a `width` x `height` frame */
export function frameRadius(width, height) {
  return Math.min(width, height) * FRAME_RADIUS;
}

/**
 * The outline as a `Shape`, centred on the origin.
 *
 * Quadratic curves rather than arcs: the control point is the corner the shape
 * would have had, which is both what a rounded rectangle means and what makes
 * this readable next to `roundedOutline` below.
 */
export function roundedRectShape(width, height, radius) {
  const shape = new Shape();
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

/**
 * A rounded rectangle as a filled surface with 0…1 UVs.
 *
 * `ShapeGeometry` writes each vertex's own XY as its UV, which is metres — a
 * plane a fifth of a metre across would sample a fifth of the top-left pixel.
 * Normalising them here is what makes this a drop-in for `PlaneGeometry`, which
 * is what every caller was using.
 */
export function roundedPlaneGeometry(width, height, radius = frameRadius(width, height)) {
  const geometry = new ShapeGeometry(roundedRectShape(width, height, radius), CORNER_STEPS);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) / width + 0.5, uv.getY(i) / height + 0.5);
  }
  uv.needsUpdate = true;
  return geometry;
}

/** The four corner arcs, as centre and angle span. Shared so the outline and the
 *  ray anchors cannot disagree about where a corner is. */
function corners(halfX, halfY, radius) {
  const r = Math.min(radius, halfX, halfY);
  return [
    { cx: -halfX + r, cy: -halfY + r, from: Math.PI, r },
    { cx: halfX - r, cy: -halfY + r, from: Math.PI * 1.5, r },
    { cx: halfX - r, cy: halfY - r, from: 0, r },
    { cx: -halfX + r, cy: halfY - r, from: Math.PI * 0.5, r },
  ];
}

/**
 * The outline as a closed loop of points, for drawing with line segments.
 *
 * Returned as points rather than segments because the caller pairs them up
 * itself — the fat-line buffer wants `(a, b)` and the loop closes back onto its
 * first point, which is easier to state here than to remember there.
 *
 * @returns {number[][]} `[x, y, z]` triples, counter-clockwise, first ≠ last
 */
export function roundedOutline(halfX, halfY, radius, z = 0) {
  const points = [];
  corners(halfX, halfY, radius).forEach(({ cx, cy, from, r }) => {
    for (let i = 0; i <= CORNER_STEPS; i += 1) {
      const angle = from + (Math.PI / 2) * (i / CORNER_STEPS);
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle), z]);
    }
  });
  return points;
}

/**
 * Where a frustum's four rays should meet the frame: the middle of each corner
 * arc.
 *
 * Not the corner the rectangle would have had — that point is outside a rounded
 * frame, so the rays would overshoot and cross it. The arc's midpoint is on the
 * frame, and it is the point of the corner furthest from the centre, so the rays
 * still read as going to the corners.
 */
export function roundedCornerAnchors(halfX, halfY, radius, z = 0) {
  return corners(halfX, halfY, radius).map(({ cx, cy, from, r }) => {
    const angle = from + Math.PI / 4;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle), z];
  });
}
