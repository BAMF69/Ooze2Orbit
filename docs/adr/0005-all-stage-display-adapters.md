# Stage adapters for shared display foundations

Date: 2026-11-13. Status: implemented; physical-device testing pending.

The user approved the cell display pass and explicitly requested it for all remaining stages.
Extend the same viewport/safe-area/fullscreen/rotation infrastructure, with stage-specific camera
policies and native readable panels. Reuse existing atlases for icon buttons and daughter previews.
World coordinates, simulation tuning and save shapes remain unchanged.

Alternatives: scaling each fixed 640x360 screenshot would make phone text unreadable; rewriting all
canvas UI/cameras independently would duplicate display and pause rules; doing nothing misses the
requested platforms. Shared infrastructure plus small adapters retains each stage's game structure.

Consequences: creature needs a bounded follow camera and offscreen threat message; civilization
needs stacked grids and a shared hit-test transform; aquatic needs projection/background/warning
reflow; space needs dynamic center/edge calculations and scrollable icon menus. Command/details
panels pause civilization/space simulation. Native panels require shutdown cleanup, so shell stage
changes stop the old scene first. Existing action bindings and save envelopes remain unchanged.

Verified: installed Phaser 4.2.1 scale/camera APIs and source; production/browser tests. Emulation
does not establish actual Safari, Android or controller compatibility. Revisit on physical devices,
and before adding touch movement, higher-resolution art or larger simulation budgets.
