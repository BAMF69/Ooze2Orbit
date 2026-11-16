// ---------------------------------------------------------------------------
// stageSaves.test.ts
// Purpose : Locks saving and continuing the space stage (BAMF69 2026-11-10): the campaign round trips through JSON
//           exactly, odd data is clamped or refused (never trusted), savedAt lets the menu continue the most recent
//           stage, and export files carry the space save.
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { describe, expect, it } from "vitest";
import { packBundle, unpackBundle } from "../src/game/aquatic/runSave";
import { afterBattle, startCampaign, travel } from "../src/game/space/campaign";
import { packSpace, savedAt, unpackSpace } from "../src/game/stageSaves";

const json = (v: unknown) => JSON.parse(JSON.stringify(v));
const temper = { cautious: 0.2, aggressive: 0.5, adaptable: 0.3 };
const none = { kinetic: 0, beam: 0, spore: 0 };

describe("space: restore in that star system with everything", () => {
  it("round trips the campaign", () => {
    let c = startCampaign({ temper });
    c = afterBattle(travel(c, "driftfield"), "won", none, 90).c;
    const back = unpackSpace(json(packSpace({ campaign: c, temper }, 7)), startCampaign({ temper }));
    expect(back.problems).toEqual([]);
    expect(back.run!.campaign).toEqual(c);
    expect(back.run!.campaign.system).toBe("driftfield");
  });
  it("refuses unknown hulls or parts and newer builds; an unknown system means home", () => {
    const base = startCampaign({ temper });
    expect(unpackSpace({ kind: "space_run", v: 1, campaign: { fit: { hull: "deathstar", parts: [] } } }, base).run).toBeNull();
    expect(unpackSpace({ kind: "space_run", v: 99 }, base).run).toBeNull();
    expect(unpackSpace({ kind: "space_run", v: 1, campaign: { ...json(base), system: "mars" } }, base).run!.campaign.system).toBe("hearth");
  });
  it("savedAt picks the most recent; unstamped or finished saves count as 0", () => {
    expect(savedAt(packSpace({ campaign: startCampaign({ temper }), temper }, 500))).toBe(500);
    expect(savedAt({ kind: "aquatic_run", v: 1 })).toBe(0);
    expect(savedAt({ kind: "aquatic_run", v: 1, finished: true, savedAt: 9 })).toBe(0);
  });
  it("export files carry the space save; a mislabelled one is refused", () => {
    const b = unpackBundle(packBundle({ lineage: { species: [] }, space_run: packSpace({ campaign: startCampaign({ temper }), temper }, 9) }, "2026-11-15"));
    expect(b.problems).toEqual([]);
    expect(Object.keys(b.slots).sort()).toEqual(["lineage", "space_run"]);
    expect(unpackBundle(packBundle({ space_run: { kind: "aquatic_run" } }, "x")).problems.length).toBe(1);
  });
});
