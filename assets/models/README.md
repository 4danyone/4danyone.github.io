# Models

One file, used by the pipeline visualization's input camera
(`assets/js/pipeline/phone.js`).

## `iphone-17-pro.glb` — CC BY 4.0

**"iPhone 17 Pro" by Ranguel**, from Sketchfab, licensed
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

<https://sketchfab.com/3d-models/iphone-17-pro-4541aa8a28324b33a2baaf81d263aaec>

The licence has exactly one condition: credit the author. That credit lives in
the attribution comment block at the top of `index.html`'s `<head>`, marked
there as not-a-TODO. **If the model stays, the credit stays.** Swapping in a
different model is the only reason to remove it.

CC BY also permits the modifications below, which are substantial — the file
that ships is a small fraction of what was downloaded, and looks it up close.

| sha256 | `080bebf1b69c3f645a062c23b5819f3fae33469f870b6fd662f9abd6f96a58bc` |
|---|---|

### How it got from 8.9 MB to 246 KB

The download is 8.92 MB: 6.69 MB of textures across eight PNGs (largest 2.9 MB)
and 42191 vertices / 51223 triangles of geometry. Both numbers are sized for a
model you can put your nose against. This one is drawn about thirty pixels tall
at the far end of a frustum, so essentially all of it is detail nobody can
resolve.

Rerun with [gltf-transform](https://gltf-transform.dev) 4.x, which is a
**build-time** tool — nothing here is installed, imported or fetched at runtime,
and the repository stays a folder of files:

```sh
G="npx --yes @gltf-transform/cli@4"
$G prune    in.glb  p1.glb --keep-attributes false   # drop unused nodes/attrs
$G dedup    p1.glb  p2.glb
$G resize   p2.glb  p3.glb --width 128 --height 128  # 6.69 MB of texture -> 2.2 MB
$G webp     p3.glb  p4.glb --quality 80
$G simplify p4.glb  p5.glb --ratio 0.08 --error 0.004
$G prune    p5.glb  p6.glb --keep-attributes false   # sweep what simplify orphaned
$G quantize p6.glb  iphone-17-pro.glb
```

Result: **8.92 MB → 246 KB (36×)**, 6632 vertices / 5726 triangles, attributes
`POSITION / NORMAL / TANGENT / TEXCOORD_0`.

The two steps doing the real work are `resize` and `simplify`, in that order —
textures were three quarters of the file, and once they were small the geometry
became the whole cost. `--error 0.004` is 4 mm of allowed deviation on a 15 cm
body, which is invisible at the size it is drawn and holds the silhouette,
the chamfer and the camera plateau.

Extensions in the output — `EXT_texture_webp`,
`KHR_materials_emissive_strength`, `KHR_materials_specular`,
`KHR_materials_transmission`, `KHR_mesh_quantization`,
`KHR_texture_transform` — are all supported by the vendored `GLTFLoader`.
`KHR_materials_transmission` is *loaded* and then switched off at runtime; see
`phone.js` for why (it costs a whole extra render pass to tint two lens covers).

### What the loading code relies on

`phone.js` orients the model by measuring it, not by hardcoding a rotation, but
it does read two material names out of the file:

- `Camera_Lens` — the lens barrels, which say which end is the top.
- `OLED` — the display, which says which face is the front, and where the
  viewfinder plane goes.

Nothing else in the file is named-addressed. A replacement model needs those
two names, or `phone.js` needs its two constants changed.
