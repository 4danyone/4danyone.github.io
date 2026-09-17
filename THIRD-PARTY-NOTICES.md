# Third-party notices

Everything this page loads comes from this repository — there are no CDN links
and no package manager — so everything third-party is a file committed here.
This is the list, and it is the attribution the licences below require.

---

## iPhone 17 Pro — CC BY 4.0

`assets/models/iphone-17-pro.glb`

**"iPhone 17 Pro" by Ranguel**, from Sketchfab.
<https://sketchfab.com/3d-models/iphone-17-pro-4541aa8a28324b33a2baaf81d263aaec>

Licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

**Changes made.** The file that ships is a small fraction of what was
downloaded: pruned of unused nodes, deduplicated, textures resized to 128px and
recompressed to WebP, meshes simplified, then quantized — 8.92 MB down to
246 KB. CC BY permits this and requires that it be stated, which is what this
paragraph is. `assets/models/README.md` records the exact command.

Used by the pipeline visualization for the handset the input camera is drawn
holding.

---

## three.js r185 (0.185.1) — MIT

`assets/js/vendor/three.module.js`, `three.core.js`, `GLTFLoader.js`,
`BufferGeometryUtils.js`, `SkeletonUtils.js`

Copyright © 2010–2025 three.js authors.
<https://threejs.org/> · <https://github.com/mrdoob/three.js/blob/dev/LICENSE>

Vendored byte-identical to the published release — no vendored file is patched.
`assets/js/vendor/README.md` records the hashes and how to re-verify them.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## Lato — SIL Open Font License 1.1

`assets/fonts/lato-latin-{400,700}-normal.woff2` and their `latin-ext` pair

Copyright © Łukasz Dziedzic.
<https://openfontlicense.org/> · <https://fonts.google.com/specimen/Lato>

The same subsetted woff2 files Google Fonts serves, copied into this repository
so the page has no third-party request. Only weights 400 and 700 are shipped;
`assets/css/base.css` explains why that constrains what the page may ask for.

---

## Simple Icons — CC0 1.0

The arXiv, GitHub and Hugging Face brand glyphs in `index.html`'s inline SVG
sprite come from [Simple Icons](https://github.com/simple-icons/simple-icons),
commit `34c22501f9ac9f22b12f825677ccbab1fb22e14b`.

Simple Icons is made available under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

---

## Phosphor Icons — MIT

The category glyphs in `index.html`'s inline SVG sprite and the arrow baked into
`.dev/tools/mosaic-chrome.png` come from
[Phosphor Icons](https://github.com/phosphor-icons/core).

Copyright © 2023 Phosphor Icons. Licensed under the MIT License; the full MIT
terms reproduced above apply with this copyright notice.
