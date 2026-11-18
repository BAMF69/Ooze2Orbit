# ADR 0007: Painted art ships as WebP; PNG masters stay outside the build

- Status: accepted
- Date: 2026-11-17

## Context
The illustrated remaster grew the web build to 122 MB, of which 113 MB was 84 painted PNG sheets (1 to 2 MB each).
That is a slow first load on GitHub Pages and on phones, and every CI and Pages run pulled all of it through Git LFS,
which counts against the repo owner's monthly LFS bandwidth quota. BAMF69 asked to compress the art (2026-11-17).

## Options considered
1. **WebP, lossy quality 90, alpha kept**: 112.6 MB down to 27.9 MB. Same pixel dimensions, so atlas JSON and measured
   frame rectangles stay valid. Phaser and every current browser load it. Slight softening invisible at game scale.
2. **Quantized PNG (256 colours)**: keeps the `.png` paths, but bands the painted gradients and saves less.
3. **AVIF**: smaller still, but slower to decode on phones and older Safari support is patchier.
4. **Do nothing**: no work, but a 120 MB demo and LFS quota risk.

## Decision
Option 1. It cut the art by 75 % with no visible loss and no new runtime dependency.
`tools/art/compress_art.py` moves any PNG over 200 KB from `public/assets/art/` into `assets_src/art_masters/`, writes
the WebP into the build, and rewrites literal paths. Small pixel-art atlases stay PNG (lossy compression smears hard
pixel edges; they are a few KB). CI and Pages pull LFS without `assets_src/**`.

## Consequences
- Good: build about 120 MB to about 35 MB; per-run LFS download falls by about 110 MB; one command for new art.
- Bad / costs: two copies of each painted image in the repo (master and WebP). Paths built from templates are not
  rewritten by the script (it lists them). Tools that measure pixels must read the masters (done for
  `measure_evolution_bodies.py` and `build_avatar_inspector.mjs`).
- `tests/artBudget.test.ts` fails if a PNG over 200 KB lands in `public/assets/art/` or a master lacks its WebP.
- Revisit if a painted sheet shows visible WebP artifacts in play (raise `--quality` for that file) or if a target
  platform cannot decode WebP.

## Notes
Measured on all 84 sheets with Pillow 11 WebP encoder, method 6 (**verified**): PNG 112.6 MB, WebP q90 27.9 MB,
q82 about 24.8 MB. Pillow is a dev-machine tool only; nothing new ships to players.
