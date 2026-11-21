# High-density rendering

Settings > Display > Graphics quality changes rendering resolution live and persists with the
existing settings. Logical world dimensions, gameplay, camera framing and pointer coordinates stay
unchanged. This change preserves the HUD implementation and artwork from main.

| Preset | Maximum device density | Long edge | Pixel budget |
| --- | --- | --- | --- |
| Performance | 1x | 1280 | 1280×720 |
| Auto desktop | 2x | 2560 | 2560×1440 |
| Auto touch | 2x | 1920 | 1920×1080 |
| High | 2x | 3840 | 3840×2160 |
| Ultra | 3x | 5120 | 5120×2880 |

Targets fit within every cap and the GPU renderbuffer/viewport limits, without rendering below the
logical baseline. Auto uses fixed budgets rather than measured frame-rate adaptation. High supports
native 4K desktop output; Ultra permits 3x phone density. Performance reduces GPU cost. The canvas
exposes data-render-resolution and data-render-quality for inspection.

src/shell/renderResolution.ts adapts Phaser 4.2 WebGL draw targets and the camera internal/combined
matrices at the renderer boundary, restoring logical camera state in finally. Logical culling and
input remain unchanged. DisplayViewport reapplies sizing on resize, rotation, fullscreen, device
pixel-ratio changes and WebGL recovery. The Canvas renderer fallback retains logical resolution.
Global nearest-neighbor/pixel-art scaling is disabled; illustrated textures use smooth filtering.

This does not replace artwork or increase raster source detail. Larger background/sprite masters
remain a separate art pass. Physical-device frame rate, heat and battery use need playtesting.

## Validation

Based on main at 4157e20. All 521 scene, HUD and asset files match that base (hydrated LFS assets
verified against recorded SHA-256 hashes). 603 unit tests, typecheck, 11 shader recipe compiles and
production build pass. Browser checks cover four quality presets in cell/aquatic at 3840×2160,
375×812 and 812×375, including DPR3 phones. Logical camera dimensions remain unchanged. Pixel
readback and pointer hits pass in creature/civilization/space; simulated DPR change and WebGL
recovery pass. Production Settings menu smoke reaches DRIVE_DONE menus without errors.
