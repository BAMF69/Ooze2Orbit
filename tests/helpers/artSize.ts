// Purpose: Size of a shipped art sheet, read from its WebP header (no image dependency), after checking its PNG
//          master in assets_src/art_masters/ has exactly the same size (main's art rule: masters PNG, build WebP).
import { readFileSync } from "node:fs";
import { expect } from "vitest";

function webpSize(b: Buffer): [number, number] {
  expect(b.subarray(0, 4).toString() + b.subarray(8, 12).toString()).toBe("RIFFWEBP"); // an LFS pointer fails here: run `git lfs pull`
  const kind = b.subarray(12, 16).toString();
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") { const v = b.readUInt32LE(21); return [1 + (v & 0x3fff), 1 + ((v >> 14) & 0x3fff)]; }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}
/** `rel` is the path the game loads, for example "assets/art/creature_hd_charger_v1.webp". */
export function sheetSize(rel: string): [number, number] {
  const shipped = webpSize(readFileSync(`public/${rel}`));
  const master = readFileSync(`assets_src/art_masters/${rel.split("/").pop()!.replace(/\.webp$/, ".png")}`);
  expect(master.subarray(1, 4).toString()).toBe("PNG");
  expect([master.readUInt32BE(16), master.readUInt32BE(20)], `${rel}: PNG master and WebP differ in size`).toEqual(shipped);
  return shipped;
}
