// Original inked interface symbols. Static SVG paths scale crisply without a new raster dependency.
// Authored: Written with Codex for Ooze2Orbit.
export type UiIcon = "cell" | "aquatic" | "creature" | "civ" | "space" | "spikes" | "shell" | "mouth" | "foodSense" | "jetBurst" | "softLanding";
const paths: Record<UiIcon, string> = {
  cell: '<path fill="#a9db6d" d="M15 36Q10 13 33 12Q59 7 65 30Q72 52 50 64Q18 72 15 36Z"/><circle cx="39" cy="39" r="13" fill="#bb6ba0"/><ellipse cx="28" cy="24" rx="7" ry="4" fill="#f1edb0"/>',
  aquatic: '<path fill="#75c8bd" d="M12 39Q35 8 61 34L73 23V56L60 46Q32 70 12 39Z"/><path fill="#e5c67b" d="M35 24L46 12L50 28M37 54L44 65L49 52"/><circle cx="25" cy="36" r="3" fill="#102532"/>',
  creature: '<path fill="#d9a45e" d="M12 49L22 26L44 18L64 31L65 46L50 48L57 65L43 65L37 48L27 49L24 65L12 65L19 44Z"/><path fill="#f5e5af" d="M30 23L33 9L43 20M46 20L54 9L56 26"/><circle cx="53" cy="33" r="3" fill="#102532"/>',
  civ: '<path fill="#8ac4ad" d="M10 65V35L23 25L35 36V65ZM35 65V17L49 8L62 18V65ZM61 65V39L72 30V65Z"/><path fill="none" d="M20 41V48M46 25V33M46 44V52M65 46V54"/>',
  space: '<path fill="#e4c878" d="M21 52Q20 22 61 11Q70 45 43 60Z"/><path fill="#82ccb8" d="M28 35L12 40L14 62L30 54M49 50L63 64L72 45L58 36"/><ellipse cx="46" cy="32" rx="9" ry="12" transform="rotate(38 46 32)" fill="#ae71a6"/><path fill="#f5a755" d="M22 56L11 74L38 61"/>',
  spikes: '<path fill="#eee3bc" d="M9 62L15 19L32 49L39 6L50 49L69 19L71 62Z"/><path fill="#af7ca9" d="M9 62Q36 46 71 62L65 72H16Z"/>',
  shell: '<path fill="#7acbbb" d="M11 60Q7 13 44 10Q76 13 70 61L53 70L40 61L25 70Z"/><path fill="none" d="M15 44Q37 16 67 35M15 58Q41 33 70 49M29 64Q45 47 65 59"/>',
  mouth: '<ellipse cx="40" cy="40" rx="27" ry="30" fill="#e9b568"/><ellipse cx="40" cy="37" rx="15" ry="19" fill="#5b324b"/><path fill="none" d="M20 60Q38 74 60 57"/>',
  foodSense: '<path fill="#a9db6d" d="M14 59Q8 23 58 17Q69 61 26 64Z"/><path fill="none" d="M19 63L51 29M54 7Q74 13 74 32M60 4Q81 8 80 27"/>',
  jetBurst: '<path fill="#f6bb60" d="M44 5L15 46H34L27 74L68 30H46L58 5Z"/>',
  softLanding: '<path fill="#7dc7d4" d="M40 8L68 19V42Q61 65 40 73Q17 64 12 42V19Z"/><path fill="none" d="M24 41L36 54L57 29"/>',
};
export function uiIcon(name: UiIcon): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 80 80");
  svg.setAttribute("aria-hidden", "true"); svg.classList.add("ui-symbol");
  svg.innerHTML = `<g stroke="#0a2634" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</g>`;
  return svg;
}
