// ---------------------------------------------------------------------------
// saveFiles.ts
// Purpose : The menu's save file actions (BAMF69 2026-11-09: "save/export so they can pick up where they left off at
//           another time"): is there a run to Continue, Export (download one JSON file holding the lineage and the
//           aquatic run), Import (pick such a file; it is checked, then written to the save slots).
// Usage   : hasRun(shell); exportSaves(shell); importSaves(shell, onDone)
// Notes   : No Phaser. The file format and its checks are pure and tested: src/game/aquatic/runSave.ts. An imported
//           file is data from outside, never trusted: unpackBundle validates it and unpackRun clamps the run again
//           when it loads. The saves themselves live in the SaveStore (autosaved by the aquatic scene).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { Log } from "../core/log";
import { EXPORT_SLOTS, RUN_SLOT, packBundle, unpackBundle, unpackRun } from "../game/aquatic/runSave";
import type { Shell } from "./app";

const LOG = "save";

const slotData = (shell: Shell, slot: string): unknown => {
  try { return shell.saves.load(slot).envelope?.data ?? null; } catch { return null; }
};

/** A run worth continuing is saved (not finished, readable). */
export function hasRun(shell: Shell): boolean {
  return unpackRun(slotData(shell, RUN_SLOT)).run !== null;
}

/** Download every save slot in one file, named with today's date. */
export function exportSaves(shell: Shell): void {
  const slots = Object.fromEntries(EXPORT_SLOTS.map((k) => [k, slotData(shell, k)]));
  if (!Object.values(slots).some((v) => v)) { shell.toast("save.nothing"); return; }
  const day = new Date().toISOString().slice(0, 10);
  const blob = new Blob([packBundle(slots, new Date().toISOString())], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ooze2orbit-save-${day}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  Log.info(LOG, `EXPORT ${a.download}`);
  shell.toast("save.exported");
}

/** Pick a save file; if it checks out, write its slots and call onDone (the menu redraws to show Continue). */
export function importSaves(shell: Shell, onDone: () => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) { shell.toast("save.import_failed", { why: "the file is too big" }); return; }
    void file.text().then((text) => {
      const b = unpackBundle(text);
      if (b.problems.length) { Log.warn(LOG, `IMPORT refused: ${b.problems.join("; ")}`); shell.toast("save.import_failed", { why: b.problems[0] }); return; }
      for (const [slot, data] of Object.entries(b.slots)) shell.saves.save(slot, data as Parameters<typeof shell.saves.save>[1]);
      Log.info(LOG, `IMPORT ${file.name}: ${Object.keys(b.slots).join(", ")}`);
      shell.toast("save.imported");
      onDone();
    }).catch((err: unknown) => {
      Log.warn(LOG, `IMPORT failed: ${String(err)}`);
      shell.toast("save.import_failed", { why: "the file could not be read" });
    });
  });
  input.click();
}
