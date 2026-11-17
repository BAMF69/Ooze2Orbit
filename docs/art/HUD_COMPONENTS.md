# HUD component assets — A-0029

Built-in imagegen, 2026-11-15. Files: public/assets/art/hud_components_{verdant,scarlet,solar}_v1.png.
Each 1774x887 transparent sheet contains a whole independent corner and centerpiece. These are new
components, not cutouts from A-0026. Runtime reads the left object and right object regions with transparent
margins; it never clips an ornament contour or applies feather masks. Attachment coordinates are recorded
in modularHudFrame.ts. Continuous vector cords join the authored tails; no raster pattern repeats.

Prompt set: production two-component transparent sprite sheet, wide 2:1 canvas with two square tiles;
left tile a complete top-left L bracket, right tile a complete symmetrical centerpiece, rounded narrow
attachment tails, clean isolated alpha, rich painted biological fantasy style, no panel/background/text,
no crop edges or feathering. Verdant: green vines, wood, leaves/berries and a leaf bud. Scarlet: red roots,
ivory bone/fangs and an original skull. Solar: amber chitin, roots, leaves and a seed gem. Verdant was
refined with built-in editing to remove ivory bone elements and preserve botanical materials and positions.
Original generation/refinement files remain in the image tool's generated_images directory.

Runtime assets:

- public/assets/art/hud_components_verdant_v1.png
- public/assets/art/hud_components_scarlet_v1.png
- public/assets/art/hud_components_solar_v1.png

## A-0030 painted rails (built-in imagegen)
Files: public/assets/art/hud_rail_verdant_v1.png, hud_rail_scarlet_v1.png, hud_rail_solar_v1.png.
Prompt set: one complete long thin horizontal organic connector with tapered rounded attachment ends,
rich sculpted painterly detail and ink outlines, varied asymmetric protrusions, genuine transparent alpha,
no panel/text/center emblem/cropped ends/repeated little motifs. Botanical wood/vines/berries; scarlet
sinew/bone/fangs; amber chitin/roots/leaves. Entire illustrations bridge landmarks; no raster pattern tiles.
