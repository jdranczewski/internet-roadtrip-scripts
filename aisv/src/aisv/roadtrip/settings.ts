import { Panel } from "../../../../minimap_tricks/src/minimap-tricks/settings/settings_components";

// Default settings
export const settings = {
    animateFurtherStraights: true,
    fadeSlightTransitions: true,
    fadeFullTransitions: true,
    turnThreshold: 5,
    pauseKey: "Escape",
    resetViewKey: " ",
}

// Initialise settings
const storedSettings = await GM.getValues(Object.keys(settings))
Object.assign(
    settings,
    storedSettings
);
GM.setValues(settings);

// Update script name so it takes up less space
const gm_info = GM.info
gm_info.script.name = "Advanced Interactive Street View"
gm_info.script.icon = null;

export const panel = new Panel("AISV", settings, gm_info);