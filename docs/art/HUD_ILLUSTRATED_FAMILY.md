# Approved illustrated cell and aquatic HUD

The shared renderer covers herbivore, carnivore and omnivore in both stages. It replaces the earlier modular component-frame presentation for these HUDs. Gameplay state, purchases, progression, input bindings and saves remain owned by the native stage code.

## Art and typography

Six original 1536×1024 RGBA atlases each contain a complete bottom strip, tapered status plate, form chamber and tab. The PNGs are retained unchanged. `src/game/illustratedHudSurfaces.json` records the production source rectangles and component alpha outlines; SVG masks isolate neighboring objects.

Strip, tab and shallow-chamber endcaps scale proportionally. Quiet middle spans adapt to width. Tall upgrade cards use nine slices so their corners retain their proportions. Status top and foot anatomy scale with width, while its quiet vertical middle accommodates the rows. Do not stretch a complete illustrated surface across arbitrary aspect ratios or substitute generic panels with detached decorations.

Live weighted Vollkorn text, colored readouts, native progress meters, Roman form numerals, historical diet colors and accessible names remain separate from artwork. The font and its SIL OFL license are bundled locally. Original SVG symbols provide resource, steak, upgrade, action and system icons.

Cell frames remain soft membranes in moss/jade, dusty wine and olive/amber. Aquatic frames develop into seaweed, fine fishlike cartilage/fin rays and overlapping armored scales. Creature-stage terrestrial reference concepts are outside this renderer.

## Final review refinements

- Status contents are inset down and right from the painted top/left rim; numbers remain readable and meters end clear of the taper.
- Gardener is a distinct painted pill using the active diet's tab surface, with a native button and 44px minimum target.
- Aquatic form chambers are smaller and inset from the outer strip, keeping their existing material and a visible surrounding gutter.
- The additional corner ornaments are removed. Original painted frame ends remain intact.
- Dividers between tabs rise above the frame silhouette: kelp ribbons for herbivore, a webbed dorsal fin for carnivore, and overlapping armored scutes for omnivore. Their colors match the frame; they ignore pointer events and remain hidden from accessibility navigation. Notifications clear the raised tips.

![Three diet materials using the production renderer; progress values illustrative](HUD_ILLUSTRATED_FAMILY_REVIEW.jpg)

## Responsive behavior

- Landscape strip: centered at 75% of safe usable width, with both lower side areas open.
- Portrait strip: safe usable width minus 12px, 90px tall at default text scale. Aquatic form chambers are 29px tall, with about 22px outer horizontal clearance and 13px below them at 375×812.
- Aquatic health/stamina have priority over smaller food/dash rows. Touch depth, pace, breach and dash controls reserve a separate position for acquired Shock.
- Touch upgrades pause the simulation and scroll in a bounded tray above an anchored strip. Keyboard/controller purchases remain live. Text scaling and safe-area offsets remain supported.
- The joystick uses its actual rendered radius. Concise touch labels retain descriptive accessible names.

[Actual phone gameplay capture](HUD_ILLUSTRATED_FAMILY_PHONE.jpg)

## Implementation and review

`illustratedHud.ts/css` and the surface JSON define the presentation. `hudDock.ts`, both stage HUDs and upgrade panels integrate it. The Shock readout attaches to the actual dock center after the open-layout move. Existing rules remain authoritative; sample capture values must never be baked into runtime code.

Run `python tools/dev.py check`, `python tools/dev.py test`, and `python tools/dev.py build`. The standalone development page `/hud-material-review.html` renders all three materials through the shared renderer without a simulation or saves; it is not a production game screen or build entry point. `HUD_FAMILY_GENERATION_PROMPTS.md` preserves the production prompts; `HUD_CELL_PROOF.md` is historical provenance for the first atlas, and the JSON metadata is authoritative for current bounds.

Browser checks cover material identity, raised silhouette, absence of additional corners, phone fit, resource and upgrade behavior, pause/cooldowns, rotation and safe insets. Physical phone and controller testing remains outstanding.
