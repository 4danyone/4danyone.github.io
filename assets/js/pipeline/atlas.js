/**
 * One video, twenty-four planes.
 *
 * The ring needs all twenty-four generated views playing at once, and twenty-four
 * `<video>` elements is not an option: iOS Safari caps concurrent decodes in the
 * low single digits, and 24 × 704×1280 is ~24 MB before the reader has clicked
 * anything. So the views are pre-stacked into one 6×4 grid video and each plane
 * samples its own cell by UV offset.
 *
 * The second benefit is the one that is hard to buy any other way: because every
 * tile shares a single decode clock, the twenty-four views are frame-synced by
 * construction. Twenty-four separate elements would drift, and drift is exactly
 * what would undermine a multi-view consistency claim.
 *
 * When `masked` is set the atlas is twice as tall: the views fill the top half
 * and their foreground masks the bottom half, cell for cell. That lets a plane
 * show the view with its background (what the model produced) or the subject
 * alone (what the reconstruction was fit from) from a single decode — no second
 * video, and no alpha codec that browsers disagree about.
 *
 * All twenty-four planes share one Texture object, and the per-cell offset is
 * baked into each plane's UV attribute instead. The obvious alternative —
 * `texture.clone()` per cell, setting `offset`/`repeat` — is wrong twice over:
 * three.js applies those per *texture*, so each clone is a separate GPU texture
 * that uploads its own copy of the same decoded frame every frame. UVs are free.
 */
import {
  LinearFilter,
  NoColorSpace,
  SRGBColorSpace,
  TextureLoader,
  VideoTexture,
} from "../vendor/three.module.js";
import { createVideoSource } from "./video-source.js";

/**
 * @param {object} options
 * @param {string} options.src           the atlas video
 * @param {string} [options.poster]      a still frame of the same atlas, same
 *   layout. Shown until the video has decoded, and the only thing a device that
 *   cannot afford the video has to fall back on.
 */
export function createAtlas({ src, poster, columns, rows, masked = false }) {
  const media = createVideoSource(src);
  const video = media.element;

  const base = new VideoTexture(video);
  base.colorSpace = SRGBColorSpace;
  base.minFilter = LinearFilter;
  base.magFilter = LinearFilter;
  base.generateMipmaps = false;

  /**
   * The sub-rectangle of the atlas holding cell `index`, in UV space.
   *
   * Texture V runs bottom-up while the grid was written top-down, hence the
   * flip on the row term. Getting this wrong stacks the ring vertically
   * mirrored, which is easy to miss because a standing figure is roughly
   * symmetric top to bottom in silhouette.
   */
  const gridRows = masked ? rows * 2 : rows;

  function uvRect(index) {
    return {
      x: (index % columns) / columns,
      y: 1 - (Math.floor(index / columns) + 1) / gridRows,
      width: 1 / columns,
      height: 1 / gridRows,
    };
  }

  /**
   * How far below a cell its mask sits, in UV. V runs bottom-up while the grid
   * was written top-down, so the mask — which is *lower* in the image — is at a
   * *smaller* V.
   */
  const maskOffset = masked ? -rows / gridRows : 0;

  // The video is ~1 MB and takes a moment; a still frame of the same atlas is
  // ~40 KB and lands almost immediately, so the ring shows real generated views
  // from the start rather than flat placeholder tiles. It is also what a
  // low-power path can use instead of decoding video at all.
  const posterTexture = poster
    ? new TextureLoader().load(poster, (texture) => {
        // A masked poster mixes display RGB and linear coverage in one image,
        // so it cannot be tagged wholly sRGB. Its custom shader decodes only
        // the RGB samples by hand and leaves the mask samples untouched.
        texture.colorSpace = masked ? NoColorSpace : SRGBColorSpace;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = false;
      })
    : null;

  // Atlas owns textures/UVs; the source owns bytes/decoder; playback.js owns
  // the clock. A renderer can subscribe once and also get late-error fallback.
  const ready = media.ready.then(() => base);
  ready.catch(() => {});
  return {
    media,
    poster: posterTexture,
    ready,
    uvRect,
    maskOffset,
    onTexture(listener) {
      const update = () => {
        const texture = media.state === "ready" ? base : posterTexture;
        if (texture) listener(texture);
      };
      update();
      return media.subscribe(update);
    },
    // Exact controls are retained for the offline figure-capture driver.
    play: () => media.play().catch(() => {}),
    pause: () => media.pause(),
    seek: (seconds, signal) => media.seek(seconds, signal),
    get currentTime() { return video.currentTime; },
    frame(fps, frames) {
      return media.state === "ready" ? Math.floor(video.currentTime * fps) % frames : -1;
    },
    follow(seconds, tolerance) {
      if (media.state !== "ready" || video.seeking) return;
      if (Math.abs(video.currentTime - seconds % video.duration) > tolerance) {
        video.currentTime = seconds % video.duration;
      }
    },
    dispose() {
      media.dispose();
      base.dispose();
      posterTexture?.dispose();
    },
  };
}

/** The atlas grid, matching what .dev/tools/build_web_media.sh writes. */
export const ATLAS_GRID = { columns: 6, rows: 4 };
