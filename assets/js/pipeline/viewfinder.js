/**
 * The camera app drawn over the handset's screen.
 *
 * The screen was showing the source video and nothing else, which reads as a
 * phone *playing* a video rather than a phone *taking* one — and the difference
 * is the whole claim of act 1. A recording interface says the video is being
 * captured right now, by the object it is drawn on, which is what the frustum
 * in front of it has been asserting all along.
 *
 * Drawn into a canvas rather than assembled from meshes. It is a Dynamic Island
 * and three buttons: as geometry that is eight small meshes with eight sets of
 * coordinates to keep in agreement, and as 2D drawing it is what it looks like.
 * One texture, one extra plane, and the proportions are readable in the code.
 *
 * Everything here is proportional to the screen, so the same drawing is correct
 * whatever the handset is scaled to.
 */
import { CanvasTexture, SRGBColorSpace } from "../vendor/three.module.js";

/**
 * Texture width. The handset's screen is never drawn more than about 200 px
 * tall on the page, so this is already several times over.
 */
const WIDTH = 512;

/**
 * iOS's record red, and it is deliberately not a token. `--accent` and the rest
 * describe *this page*; this is a depiction of another product's interface, the
 * same way the skeleton keeps the pipeline's own palette rather than being
 * retinted to match the site.
 */
const RECORD_RED = "#FF453A";
const CHROME = "rgba(255, 255, 255, 0.95)";

/** Dynamic Island: share of the screen's width, and its own aspect. */
const ISLAND = { width: 0.3, aspect: 3.4, top: 0.016 };
/**
 * The control row, all as fractions of the screen's *width* so circles stay
 * round.
 *
 * Chunkier than a real camera app, and deliberately. The screen is about ninety
 * pixels wide where this is drawn, so an accurate 1pt ring works out under a
 * pixel and disappears — the first pass rendered as a red square and a white dot
 * with the two rings and the pause bars simply gone. The handset is already a
 * symbol at symbol scale (see `PHONE_SCALE`); its interface is drawn to the same
 * standard, which is "reads as what it is", not "measures correctly".
 */
const CONTROLS = { bottom: 0.2, main: 0.082, side: 0.082, spread: 0.28, stroke: 0.013 };

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/**
 * @param {number} aspect the screen's width over its height
 * @returns {CanvasTexture} transparent except for the interface
 */
export function createViewfinder(aspect) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = Math.round(WIDTH / aspect);
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  // The cutout. Opaque black, because that is what it is — not a dark overlay
  // but a hole where there is no screen.
  const islandWidth = w * ISLAND.width;
  const islandHeight = islandWidth / ISLAND.aspect;
  roundedRect(ctx, (w - islandWidth) / 2, h * ISLAND.top, islandWidth, islandHeight, islandHeight / 2);
  ctx.fillStyle = "#000";
  ctx.fill();

  // A wash under the controls. White chrome over a bright frame of a video shot
  // in daylight is otherwise unreadable, which is why every camera app has one.
  const wash = ctx.createLinearGradient(0, h * 0.72, 0, h);
  wash.addColorStop(0, "rgba(0, 0, 0, 0)");
  wash.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  const cy = h - w * CONTROLS.bottom;
  const mainR = w * CONTROLS.main;
  const sideR = w * CONTROLS.side;
  const spread = w * CONTROLS.spread;
  ctx.lineWidth = w * CONTROLS.stroke;
  ctx.strokeStyle = CHROME;

  // Centre: stop recording — a ring around a red square.
  circle(ctx, w / 2, cy, mainR);
  ctx.stroke();
  const square = mainR * 0.84;
  roundedRect(ctx, w / 2 - square / 2, cy - square / 2, square, square, square * 0.26);
  ctx.fillStyle = RECORD_RED;
  ctx.fill();

  // Left: pause — a ring around two bars.
  circle(ctx, w / 2 - spread, cy, sideR);
  ctx.stroke();
  ctx.fillStyle = CHROME;
  const barWidth = sideR * 0.3;
  const barHeight = sideR * 0.78;
  [-1, 1].forEach((side) => {
    roundedRect(
      ctx,
      w / 2 - spread + side * sideR * 0.26 - barWidth / 2,
      cy - barHeight / 2,
      barWidth,
      barHeight,
      barWidth * 0.4,
    );
    ctx.fill();
  });

  // Right: take a still while recording — a white disc on a grey one.
  circle(ctx, w / 2 + spread, cy, sideR);
  ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
  ctx.fill();
  circle(ctx, w / 2 + spread, cy, sideR * 0.72);
  ctx.fillStyle = "#fff";
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  // Drawn in sRGB like any other image; without this the chrome comes out
  // washed against the video underneath it.
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
