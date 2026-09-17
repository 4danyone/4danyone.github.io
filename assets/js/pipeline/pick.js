/**
 * Choosing a camera by pointing at it.
 *
 * Hover lifts the frustum under the cursor and the cursor becomes a pointer, so
 * the planes advertise that they are pressable the way a button does. Clicking
 * one selects it; clicking it again — or clicking past the ring into empty
 * space — clears it.
 *
 * Picking is only live while the planes are showing generated views — act 3.
 * Before that the ring is either absent (act 1) or carrying the conditioning
 * skeletons the model has not yet been given (act 2), and offering to open
 * "this camera's video" when no video exists yet would be a promise the scene
 * cannot keep; after it, act 4 folds the ring away and takes the planes with
 * it.
 *
 * This used to be paired with a DOM ring control — twenty-four dots laid out at
 * their true azimuths, bottom left — which was removed because it read as a
 * fiddly extra widget rather than a help. **That leaves camera selection
 * pointer-only**, which is a real accessibility gap: a keyboard user can reach
 * the section via the stage timeline but cannot pick a camera. If it comes
 * back, it should come back as something a reader would actually want to use,
 * not as a compliance box.
 */
import { Raycaster, Vector2 } from "../vendor/three.module.js";
import { NO_GLOW_LAYER } from "./bloom.js";

export function createPicker({ canvas, ring, onChange }) {
  const raycaster = new Raycaster();
  // A Raycaster filters by layer just like a camera, and defaults to layer 0
  // only. The camera planes live on NO_GLOW_LAYER so the bloom pass can skip
  // them — which silently made every one of them unhittable until this line
  // existed. Anything that moves a pickable object off layer 0 has to come
  // back here.
  raycaster.layers.enable(NO_GLOW_LAYER);
  const pointer = new Vector2();
  const state = { selected: -1, hovered: -1 };
  let enabled = false;

  // A pointerdown that turns into a drag is an orbit, not a click. Comparing
  // against the down position is what tells them apart — without this, every
  // drag that happens to end over a frustum also selects it.
  let downAt = null;
  const DRAG_SLOP = 6;

  function hitTest(event, camera3d) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera3d);
    const hits = raycaster.intersectObjects(ring.targets, false);
    if (!hits.length) return -1;
    return ring.targets.indexOf(hits[0].object);
  }

  let camera3d = null;
  /** The stage owns the camera and hands it over each frame. */
  function setCamera(value) {
    camera3d = value;
  }

  function select(index) {
    const next = index < 0 || index === state.selected ? -1 : index;
    if (next === state.selected) return;
    state.selected = next;
    onChange?.(next < 0 ? null : ring.entries[next]);
  }

  function onPointerDown(event) {
    downAt = { x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event) {
    if (!camera3d || !enabled) return;
    const index = hitTest(event, camera3d);
    if (index !== state.hovered) {
      state.hovered = index;
      canvas.style.cursor = index >= 0 ? "pointer" : "grab";
    }
  }

  function onPointerUp(event) {
    if (!camera3d || !downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved > DRAG_SLOP || !enabled) return;
    // A click that lands on nothing clears the selection. Without this the only
    // way out of a picked camera is to find and click that same camera again,
    // which is a trap rather than a toggle.
    select(hitTest(event, camera3d));
  }

  function onPointerLeave() {
    state.hovered = -1;
    downAt = null;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);

  return {
    state,
    setCamera,

    /** Live only while the planes carry generated views — act 3. */
    setEnabled(value) {
      if (value === enabled) return;
      enabled = value;
      if (!enabled) {
        state.hovered = -1;
        select(-1);
        canvas.style.cursor = "grab";
      }
    },
    dispose() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    },
  };
}
