/**
 * A lighting environment for the one lit object in the scene.
 *
 * The handset is a photoscanned model with physically-based materials —
 * anodized aluminium at metalness 0.27, screws at 1.0, glass at roughness 0.
 * A metal surface shows its surroundings and nothing else, so with no
 * environment to reflect those materials render black no matter how many
 * lights are added. That is not a lighting problem, it is a missing-world
 * problem, and the fix is a world.
 *
 * So: a shoebox studio, three emissive panels, prefiltered once at startup by
 * `PMREMGenerator` into a mip chain the material shader can sample by
 * roughness. It is the same trick three.js's own `RoomEnvironment` add-on
 * plays, written here in thirty lines instead of vendoring a file — the room
 * only has to be convincing in reflection, and at reflection it is three
 * bright rectangles either way.
 *
 * The result is assigned per material, never to `scene.environment`. Nothing
 * else on this stage is lit and nothing else should start being lit by
 * accident.
 */
import {
  BackSide,
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  Scene,
} from "../vendor/three.module.js";

/** [w, h, d, x, y, z, colour, intensity] — a key, a rim, and a floor bounce. */
const PANELS = [
  // Key: broad, warm, high and in front. Draws the long specular streak down
  // the aluminium rail that reads as "machined".
  [4.0, 2.4, 0.1, 0.0, 2.2, 2.6, 0xfff3e2, 5.4],
  // Rim: behind and to one side, so a far edge separates from the black backdrop
  // instead of dissolving into it. Only *slightly* cool — it used to be a
  // saturated 0x9dc4ff, which is a handsome edge light on a handset and a
  // disaster on the floor's turntable, a metre-wide mirror that took its whole
  // colour from whichever panel it happened to be facing. The floor came out
  // blue at some azimuths and grey at others. A near-neutral rim still separates
  // the edge and cannot tint anything.
  [2.6, 3.0, 0.1, -2.4, 1.0, -2.2, 0xdae3f0, 2.8],
  // Bounce: dim, below, stopping the underside from going pure black.
  [4.0, 0.1, 4.0, 0.0, -1.8, 0.0, 0x6c7791, 1.0],
];

/**
 * @param {WebGLRenderer} renderer
 * @returns {{texture: Texture, dispose: Function}}
 */
export function createEnvironment(renderer) {
  const room = new Scene();
  const box = new BoxGeometry(1, 1, 1);
  // PMREM never samples a texture here, and the attribute would just be
  // uploaded and ignored.
  box.deleteAttribute("uv");

  const materials = [];
  const add = (color, intensity, w, h, d, x, y, z) => {
    const material = new MeshBasicMaterial({ color });
    // Above 1.0 on purpose. The prefilter target is half-float, so panels
    // brighter than white survive as highlights rather than clipping to grey.
    material.color.multiplyScalar(intensity);
    materials.push(material);
    const mesh = new Mesh(box, material);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    room.add(mesh);
  };

  const shellMaterial = new MeshBasicMaterial({ color: 0x0d1016, side: BackSide });
  materials.push(shellMaterial);
  const shell = new Mesh(box, shellMaterial);
  shell.scale.set(9, 7, 9);
  room.add(shell);

  PANELS.forEach(([w, h, d, x, y, z, color, intensity]) =>
    add(color, intensity, w, h, d, x, y, z),
  );

  const pmrem = new PMREMGenerator(renderer);
  // A little blur: the panels are hard-edged boxes, and a phone body at this
  // size wants soft reflections, not three visible rectangles.
  const target = pmrem.fromScene(room, 0.035);
  pmrem.dispose();

  box.dispose();
  materials.forEach((material) => material.dispose());

  return {
    texture: target.texture,
    dispose() {
      target.dispose();
    },
  };
}
