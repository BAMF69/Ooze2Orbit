// ---------------------------------------------------------------------------
// icons.mjs (docs/concepts/creature-hd/src)
// Purpose : C-0107 equipment icon rack restyled to the shipped uiIcons.ts language: 80x80 viewBox, one ink
//           colour (#0a2634) at 3.6 units, flat fills plus one cel band, upper-left highlight.
// Usage   : iconSvg(name, { owned }) ; RACK lists slots in group order.
// Notes   : CONCEPT ONLY. Class skills sit on a temperament-coloured disc (red aggressive / green cautious /
//           blue adaptable); nothing else in the rack uses those colours, so diet and temperament never mix.
// Authored: Written with Claude (Opus 5.5) for BAMF69.
// ---------------------------------------------------------------------------
const INK = "#0a2634";
export const TEMPERAMENT = { aggressive: "#d9534a", cautious: "#5fae55", adaptable: "#4f8fd6" };

const P = {
  gills: `<path fill="#ff7a96" d="M36 64Q10 56 8 26Q30 32 40 56Z"/><path fill="#ff7a96" d="M40 62Q26 36 40 8Q54 36 40 62Z"/><path fill="#ff7a96" d="M44 64Q50 32 72 26Q70 56 44 64Z"/>
    <path fill="none" stroke="#c4405e" stroke-width="2.4" d="M14 32L36 58M40 16V56M66 32L46 60"/><path fill="#e9b568" d="M22 70Q40 58 58 70L54 76H26Z"/>`,
  fins: `<path fill="#8fe0dc" d="M14 62Q20 22 54 10Q62 30 66 62Q42 54 14 62Z"/><path fill="none" stroke-width="2.4" d="M22 58L36 20M32 56L46 15M44 56L56 14M56 58L62 30"/>
    <path fill="#3c9c98" d="M14 62Q42 54 66 62L62 70Q40 64 18 70Z"/>`,
  claws: `<path fill="#d9a45e" d="M12 52Q14 34 34 34Q54 34 62 46L62 58Q38 64 12 58Z"/>
    <path fill="#efe5c4" d="M40 50Q58 48 64 66Q54 58 42 58Z"/><path fill="#efe5c4" d="M26 52Q42 52 46 70Q38 60 26 60Z"/><path fill="#efe5c4" d="M54 44Q70 40 74 56Q66 50 56 52Z"/>`,
  roar: `<path fill="#e4614c" d="M10 44Q14 22 38 20L50 30L36 36L48 44L36 52L50 58L38 66Q14 64 10 44Z"/><circle cx="26" cy="32" r="3.4" fill="${INK}"/>
    <path fill="#efe5c4" d="M36 36L42 33L40 39ZM36 52L42 55L40 49Z"/><path fill="none" stroke-width="3.4" d="M56 30Q64 44 56 58M64 22Q76 44 64 66"/>`,
  burrow: `<path fill="#8a5a3a" d="M4 72Q18 50 40 54Q64 50 76 72Z"/><path fill="#d9a45e" d="M24 10Q40 6 50 18L54 38Q40 44 26 38Z"/>
    <path fill="#efe5c4" d="M24 36L20 56L32 46ZM36 40L36 60L44 48ZM48 38L56 56L58 40Z"/><path fill="none" stroke-width="3" d="M10 50L4 40M70 50L78 40M64 62L76 58M16 62L6 60"/>`,
  toolUse: `<path fill="#9a6236" d="M16 72L48 26L55 31L23 76Z"/><path fill="#a8b0b2" d="M40 6Q62 4 72 18Q66 34 50 40Q36 30 40 6Z"/>
    <path fill="#d6dcdc" d="M46 10Q58 9 64 16L52 22Z"/><path fill="none" stroke-width="2.2" d="M52 22L58 34M52 22L44 30"/><path fill="#d9c48c" d="M40 30L54 38L50 45L36 37Z"/>`,
  fullArmor: `<path fill="#cfc6ae" d="M40 6L68 18V40Q62 62 40 74Q18 62 12 40V18Z"/><path fill="#8b8269" d="M40 74Q62 62 68 40V18L40 6Z" opacity="0.55"/>
    <path fill="none" stroke-width="3" d="M14 30Q40 20 66 30M14 46Q40 36 66 46M22 60Q40 52 58 60"/>`,
  iceBreath: `<path fill="#e6fbff" d="M8 52Q8 36 24 36Q28 24 42 28Q56 22 62 36Q76 38 72 52Q70 64 54 62Q40 70 26 62Q8 66 8 52Z"/>
    <path fill="none" stroke="#3f97c0" stroke-width="3.4" d="M40 34V60M29 41L51 53M51 41L29 53"/><path fill="#c8f4ff" d="M60 12L64 22L60 26L56 22Z"/>`,
};
export const ICON_LABEL = { gills: "Gills", fins: "Swimming fins", claws: "Climbing claws", roar: "Roar", burrow: "Burrow", toolUse: "Tool use", fullArmor: "Full armor", iceBreath: "Ice breath" };
export const CLASS_OF = { roar: "aggressive", burrow: "cautious", toolUse: "adaptable" };
export const RACK = [["Story", ["gills", "fins", "claws"]], ["Class", ["roar", "burrow", "toolUse"]], ["Grotto", ["fullArmor", "iceBreath"]]];

/** One icon. owned=false renders the not-yet-acquired slot: a flat grey silhouette, no colour. */
export function iconSvg(name, { owned = true, size = 80 } = {}) {
  const disc = CLASS_OF[name] ? `<circle cx="40" cy="40" r="35" fill="${owned ? TEMPERAMENT[CLASS_OF[name]] : "#3a4a50"}" stroke="${INK}" stroke-width="3.6"/>
    <path d="M14 30A30 30 0 0 1 40 8" stroke="#fff" stroke-width="3" fill="none" opacity="${owned ? 0.5 : 0.15}"/>` : "";
  const body = `<g stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${P[name]}</g>`;
  const filter = owned ? "" : `filter="url(#g${name})"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="${size}" height="${size}">
  <defs><filter id="g${name}"><feColorMatrix type="matrix" values="0.2 0.2 0.2 0 0.05  0.2 0.2 0.2 0 0.07  0.2 0.2 0.2 0 0.08  0 0 0 0.75 0"/></filter></defs>
  ${disc}<g ${filter}>${CLASS_OF[name] ? `<g transform="translate(40 40) scale(0.72) translate(-40 -40)">${body}</g>` : body}</g></svg>`;
}

/** The rack as native HTML: grouped slots in an inked organic tray (top-right HUD position). */
export function rackHtml(owned, slot = 40) {
  const pad = Math.round(slot * 0.12);
  return `<div style="display:inline-flex;gap:${pad * 2}px;align-items:center;padding:${pad}px ${pad * 2}px;border-radius:${slot * 0.45}px;
    background:linear-gradient(#25404a,#182c33);border:${Math.max(2, slot / 16)}px solid ${INK};box-shadow:inset 0 ${Math.max(1, slot / 20)}px 0 #3f6470">
    ${RACK.map(([, names]) => `<div style="display:flex;gap:${pad}px">${names.map(n => `<div title="${ICON_LABEL[n]}" style="width:${slot}px;height:${slot}px;border-radius:${slot * 0.28}px;
      background:${owned.includes(n) ? "#2f5560" : "#1a2a30"};border:${Math.max(1.5, slot / 26)}px solid ${INK};display:flex;align-items:center;justify-content:center">
      ${iconSvg(n, { owned: owned.includes(n), size: Math.round(slot * 0.84) })}</div>`).join("")}</div>`).join(`<div style="width:2px;height:${slot * 0.8}px;background:#0a2634;opacity:.8"></div>`)}</div>`;
}
