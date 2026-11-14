# Responsive display with independent cell UI

Date: 2026-11-13. Status: first cell slice implemented; physical-device validation pending.

The user approved portrait/landscape, readable controls and rotation pause while preserving the
proven cell game. Adapt the cell camera's logical dimensions to its available safe rectangle;
keep world coordinates and simulation constants unchanged. Draw status and choice/purchase panels
as native responsive UI. Reuse original atlases for previews, with their clocks tied to the scene.

Alternatives: stretching the old 640x360 screen would make text tiny on a phone; rebuilding every
Phaser text/zone layout would couple readable UI to camera resolution; doing nothing leaves
portrait play unusable. Native panels provide readable CSS-pixel text and scrolling immediately.

The shell reads safe-area CSS, maintains explicit rotation pause and clears input on pause/resume.
Existing screen stacks handle nested Settings; this browser-specific adapter adds no cross-engine
binding defaults, settings fields or save schema. Other stages keep 640x360 for staged migration.

Consequences: separate UI/engine lifecycles must be cleaned on shutdown; atlas previews need explicit
pause behavior. Portrait exposes a different portion of the same pond. Revisit framing and rendering
budgets with actual device measurements before HD assets and later stage adapters.

Verified against installed Phaser 4.2.1 scale-and-responsive skill and ScaleManager source:
FIT, setGameSize, refresh and resize events. Browser emulation is not physical-device certification.
