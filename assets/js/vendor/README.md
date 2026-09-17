# Vendored third-party code

This directory is the **only** exception to the no-dependency rule in
`CLAUDE.md`. Everything here is committed to the repository and served from it,
so the page is still a folder of files that works on any static host with no
build step, no package manager and no network fetch at runtime.

Files are copied **byte-for-byte from the published release**. Do not edit them.
If a change is needed, it belongs in `assets/js/pipeline/`, wrapping the
library rather than patching it.

## three.js r185 (0.185.1) — MIT

Used only by the interactive pipeline visualization
(`assets/js/pipeline/`). Nothing else on the page imports it, and the section
lazy-loads it, so a reader who never scrolls that far never downloads it.

| file | sha256 |
|---|---|
| `three.module.js` | `bbf5ed13fe4373f5bd38b14ea8e62e9f157327da5638edc6d3863e08b167c9c7` |
| `three.core.js` | `3718df126d69c125362a03340913204470d8c50238605150e57f808840fb7759` |

Source, and how to re-fetch and verify:

```sh
curl -sSLO https://unpkg.com/three@0.185.1/build/three.module.js
curl -sSLO https://unpkg.com/three@0.185.1/build/three.core.js
shasum -a 256 three.module.js three.core.js   # must match the table above
```

`three.module.js` imports from `./three.core.js`, so both files are required
and must sit side by side. Licence text is in `three-LICENSE`.

### The glTF loader — three more files

| file | sha256 |
|---|---|
| `loaders/GLTFLoader.js` | `97642d720f16cc9a0c9844934198e4d0c023bea8e89576d0f7545d03b2d103d2` |
| `utils/BufferGeometryUtils.js` | `5c552223a9309883743b80538d6e9cdb45e3227f30d3ec56fb2c39b46e78d595` |
| `utils/SkeletonUtils.js` | `b1632a703206c3d830de9fcbe515696770d04b71a15ee6b50afa6d2c3298c86f` |

```sh
B=https://unpkg.com/three@0.185.1/examples/jsm
curl -sSL -o loaders/GLTFLoader.js         $B/loaders/GLTFLoader.js
curl -sSL -o utils/BufferGeometryUtils.js  $B/utils/BufferGeometryUtils.js
curl -sSL -o utils/SkeletonUtils.js        $B/utils/SkeletonUtils.js
shasum -a 256 loaders/*.js utils/*.js   # must match the table above
```

The directory layout is upstream's, not a preference: `GLTFLoader` imports its
two helpers as `../utils/…`, so `loaders/` and `utils/` have to be siblings for
those paths to resolve without editing a vendored file. Its third import is the
bare specifier `three`, which the import map in `index.html` resolves — again,
so the file can stay byte-identical.

**Why this earned the exception.** The input camera is drawn holding a phone,
and the phone was procedural: an extruded rounded rectangle with three circles
for lenses. Correct dimensions, wrong everything else, and visibly so. A glTF
of a photoscanned handset is 246 KB and looks right; writing one by hand that
also looks right is not a thing anyone can do. The alternative was to keep an
object the reader can see is fake in the one place the page claims something
about the real world — that a single ordinary phone is the whole input.

The cost is honest: 160 KB of loader (36 KB gzipped) for one 246 KB model, all
of it inside the lazily-loaded pipeline section, so a reader who never scrolls
that far downloads none of it. Model provenance and licence are in
`assets/models/README.md`.

### What is deliberately *not* vendored

The rest of `examples/jsm/` — `OrbitControls`, `EffectComposer`,
`UnrealBloomPass`, `RoomEnvironment` and the shader chunks they pull in — is
written by hand instead, in `assets/js/pipeline/`:

- **bloom** — `bloom.js`, a downsample/blur/add pass over emissive lines. The
  scene is wireframes and points on black, not a lit environment, so it does
  not need the full postprocessing stack.
- **drag-to-orbit** — `orbit.js`, azimuth/elevation drag with damping.
- **environment map** — `environment.js`, a shoebox of emissive panels run
  through the core `PMREMGenerator`. This is the one the loader nearly dragged
  in with it: the model's metal materials need a world to reflect, and
  `RoomEnvironment` is the add-on that normally supplies it. Thirty lines
  instead, because a room only has to be convincing as a reflection.

The rule this directory follows is not "never vendor". It is that each library
here has to be one nobody can sensibly reimplement, argued in writing, and
loaded only by the section that needs it. Two libraries, five files, both
arguments above.
