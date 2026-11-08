// ---------------------------------------------------------------------------
// meta.ts
// Purpose : The game's name and version in one place for the shell, logs and crash files.
// Notes   : The version comes from package.json (the one version source, SOP-06).
// Authored: Written with Claude (Opus 5.5, claude-opus-5-5)
// ---------------------------------------------------------------------------
import { version } from "../../package.json";

export const GAME_NAME = "Ooze2Orbit";
export const GAME_SLUG = "project_amber_gryphon"; // the save-data prefix: kept from the codename so saved settings survive the rename
export const GAME_VERSION: string = version;
export const SETTINGS_FILE = "settings.json";
