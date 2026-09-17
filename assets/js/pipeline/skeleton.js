/**
 * The 3D skeleton: MHR70 joints wired by an edge list, animated frame by frame.
 *
 * Two things about this keypoint set are easy to get wrong:
 *
 * 1. It is *not* a kinematic tree. There is no parent per joint. The topology
 *    is an undirected edge list including shoulder-to-shoulder, hip-to-hip,
 *    eye-to-eye and the two shoulder-to-opposite-hip cross links, none of which
 *    a `parents[]` array can express.
 *
 * 2. Its colours are data, not decoration. Teal is the subject's left, yellow
 *    their right, purple the torso cross, green/orange the torso sides — and
 *    they are the same hues the conditioning videos are drawn with. That
 *    correspondence is the thing the section exists to show, so the page's own
 *    accent tokens never touch this geometry.
 *
 * The `body` link set is what renders, and it is the goliath40 drawing — the
 * keypoint set the video model was actually conditioned on, and what the ring's
 * tiles show: finger chains dropped, the five wrist-to-knuckle spokes per hand
 * kept, plus the handful of standalone anatomical dots in `extra_points`.
 * The `full` set (goliath70) stays exportable and unused: twenty-four frustums
 * around a figure is already a lot to read; thirty finger segments on top of
 * it is not more information, it is a smudge — and it is not what went in.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Points,
  ShaderMaterial,
} from "../vendor/three.module.js";
import { color, frameJoints } from "./convert.js";
import { createFatLines } from "./fat-lines.js";

/** Bones, in CSS pixels. Thin enough to read as a diagram, not as a tube. */
const BONE_WIDTH = 2.6;
/**
 * The wrist-to-knuckle spokes, as a fraction of BONE_WIDTH. Five lines leaving
 * one wrist is the densest junction on the figure, and at full bone width they
 * fuse into a paddle; thinner, they read as a hand.
 */
const SPOKE_WIDTH_SCALE = 0.6;
/**
 * Joint dots: diameter in CSS pixels, and how bright against the bones.
 *
 * A bone's width, so a dot is exactly the circle inscribed in the line it caps
 * — and the standalone dots, which cap nothing, carry the same weight as the
 * line work around them. Sized in screen space like the ribbons, because a dot
 * at a fixed world size holds that weight at exactly one distance.
 */
const DOT_DIAMETER = BONE_WIDTH;
const DOT_OPACITY = 0.8;
/** What marks a finger joint — the exporter's own token list. */
const FINGER_TOKENS = ["thumb", "forefinger", "index", "middle", "ring", "pinky"];

/**
 * Round dots, which `PointsMaterial` cannot draw — it draws squares.
 *
 * Every other mark on this figure is a ribbon; a square dot reads as a
 * different kind of object sitting on top of one, and it carries a quarter
 * more ink than the circle inside it, so at a matched width it also looks
 * heavier than the bone it belongs to.
 *
 * `gl_PointSize` is in framebuffer pixels, so `uSize` is CSS pixels times the
 * device pixel ratio — see `setSize`.
 */
const DOT_VERTEX = /* glsl */ `
  attribute vec3 aColor;
  uniform float uSize;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    gl_PointSize = uSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DOT_FRAGMENT = /* glsl */ `
  uniform float uSize;
  uniform float uOpacity;
  varying vec3 vColor;
  void main() {
    // 0 at the sprite's centre, 1 at its edge, so half a device pixel of
    // falloff is 1/uSize. Multisampling cannot antialias inside a primitive,
    // and a hard cut at this size draws a visibly stepped circle.
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float alpha = 1.0 - smoothstep(1.0 - 1.0 / uSize, 1.0, d);
    if (alpha <= 0.0) discard;
    gl_FragColor = vec4(vColor, uOpacity * alpha);
  }
`;

export function createSkeleton(skeleton, { linkSet = "body" } = {}) {
  const links = (skeleton.link_sets?.[linkSet] ?? skeleton.links.map((_, i) => i))
    .map((index) => skeleton.links[index])
    .filter(Boolean);
  const names = skeleton.joint_names ?? [];
  const isFinger = (id) =>
    FINGER_TOKENS.some((token) => (names[id] ?? "").includes(token));

  const group = new Group();
  group.name = "skeleton";

  // Screen-space ribbons rather than GL lines — see fat-lines.js. One buffer
  // for all the bones, coloured per segment, so 28 bones is still one draw.
  //
  // Ordinary alpha blending, not additive. Against the black field the two are
  // the same arithmetic, which is why additive looked right for as long as the
  // figure stood alone — but where the ring passes behind the figure additive
  // summed them, and a teal bone with a blue frustum behind it came out a paler
  // third colour. These colours are data (see above), so shifting them is worse
  // than shifting a tint; and the figure is the subject, the one thing here
  // that must simply be in front. The ring's own wireframes made this same
  // migration for the same reason — see the long note in cameras.js.
  const lines = createFatLines(links.length, { width: BONE_WIDTH });
  links.forEach((link, i) => {
    const rgb = color(link.color);
    lines.setColor(i, rgb.r, rgb.g, rgb.b);
    // A body-set link touching a finger joint is a wrist spoke — the chains
    // between finger joints are not in the set at all.
    if (isFinger(link.a) || isFinger(link.b)) {
      lines.setWidthScale(i, SPOKE_WIDTH_SCALE);
    }
  });
  lines.commitColors();
  group.add(lines.mesh);

  // Joints as dots, dimmer than the bones: every endpoint of a drawn link,
  // plus the data's extra_points — the standalone anatomical marks (neck,
  // olecranon, cubital fossa, acromion) the conditioning renders draw with no
  // link to carry them. One cloud, because the two are the same kind of mark
  // and want the same weight; only the endpoints happen to have a ribbon
  // ending under them. Nothing else: plotting all 70 leaves the thirty dropped
  // finger joints floating unconnected at the wrists, which reads as coloured
  // confetti rather than as a hand.
  const drawnJoints = [
    ...new Set([
      ...links.flatMap((link) => [link.a, link.b]),
      ...(skeleton.extra_points ?? []),
    ]),
  ].sort((a, b) => a - b);
  const jointColors = new Float32Array(drawnJoints.length * 3);
  drawnJoints.forEach((joint, i) => {
    const rgb = color(skeleton.joint_colors?.[joint] ?? "#ffffff");
    jointColors[i * 3] = rgb.r;
    jointColors[i * 3 + 1] = rgb.g;
    jointColors[i * 3 + 2] = rgb.b;
  });
  const pointGeometry = new BufferGeometry();
  pointGeometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(drawnJoints.length * 3), 3),
  );
  pointGeometry.setAttribute("aColor", new BufferAttribute(jointColors, 3));
  const points = new Points(
    pointGeometry,
    new ShaderMaterial({
      uniforms: {
        uSize: { value: DOT_DIAMETER },
        uOpacity: { value: 0 },
      },
      vertexShader: DOT_VERTEX,
      fragmentShader: DOT_FRAGMENT,
      transparent: true,
      depthWrite: false,
    }),
  );
  points.frustumCulled = false;
  group.add(points);

  const pointPositions = pointGeometry.getAttribute("position");

  function setFrame(frame) {
    const joints = frameJoints(skeleton, frame);
    drawnJoints.forEach((joint, i) => {
      pointPositions.array[i * 3] = joints[joint * 3];
      pointPositions.array[i * 3 + 1] = joints[joint * 3 + 1];
      pointPositions.array[i * 3 + 2] = joints[joint * 3 + 2];
    });
    pointPositions.needsUpdate = true;

    links.forEach((link, i) => {
      lines.setSegment(
        i,
        joints[link.a * 3], joints[link.a * 3 + 1], joints[link.a * 3 + 2],
        joints[link.b * 3], joints[link.b * 3 + 1], joints[link.b * 3 + 2],
      );
    });
    lines.commit();
  }

  /** 0 → invisible, 1 → fully drawn. Act 1 grows the skeleton with this. */
  function setOpacity(value) {
    lines.material.uniforms.uOpacity.value = value;
    points.material.uniforms.uOpacity.value = value * DOT_OPACITY;
    // Fully drawn, the figure writes depth — nothing else in the scene does.
    // Painter's order alone cannot keep the ring behind it: the conditioning
    // tiles and the frustum wireframes draw at renderOrder 1 and 2, after the
    // figure regardless of distance, so without a depth buffer to answer to
    // the far half of the ring would paint over the bones it is behind. The
    // moment the figure starts to fade it stops occluding — act 4 dissolves it
    // into the billboard arriving in the same spot, and a ghost that still
    // wrote depth would punch bone-shaped holes in that render. The handover
    // is exact: renderAmount leaves 0 at the same stage value this leaves 1.
    const occludes = value > 0.999;
    lines.material.depthWrite = occludes;
    points.material.depthWrite = occludes;
    group.visible = value > 0.001;
  }

  setFrame(0);

  return {
    group,
    setFrame,
    setOpacity,
    /**
     * Ribbons and dots are both sized in pixels, so they need the canvas size —
     * and the dots, being `gl_PointSize`, need the device pixel ratio too.
     */
    setSize(width, height, pixelRatio = 1) {
      lines.setSize(width, height);
      points.material.uniforms.uSize.value = DOT_DIAMETER * pixelRatio;
    },
    dispose() {
      lines.dispose();
      pointGeometry.dispose();
      points.material.dispose();
    },
  };
}
