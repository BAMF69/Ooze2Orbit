import { describe, expect, it } from "vitest";
import { civTheme } from "../src/game/civ/theme";
describe("civilization inherited HUD palette", () => {
 it("keeps balanced and absent evidence luminous rather than averaging to grey", () => {
  expect(civTheme({cautious:1, aggressive:1, adaptable:1}).accent).toBe("rgb(40 215 187)");
  expect(civTheme({cautious:0, aggressive:0, adaptable:0})).toEqual(civTheme({cautious:1, aggressive:1, adaptable:1}));
 });
 it("uses the leading temperament and is independent of share scale", () => {
  expect(civTheme({cautious:0, aggressive:100, adaptable:0}).accent).toBe("rgb(244 133 83)");
  expect(civTheme({cautious:0, aggressive:0, adaptable:100}).accent).toBe("rgb(179 144 244)");
  expect(civTheme({cautious:1, aggressive:8, adaptable:1})).toEqual(civTheme({cautious:10, aggressive:80, adaptable:10}));
 });
 it("treats malformed shares as absent without producing invalid colors", () => {
  expect(civTheme({cautious:NaN, aggressive:-5, adaptable:Infinity})).toEqual(civTheme({cautious:0, aggressive:0, adaptable:0}));
 });
});
