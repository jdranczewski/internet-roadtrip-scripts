import { Panel } from "../../../../minimap_tricks/src/minimap-tricks/settings/settings_components";
import { default_settings } from "../default_settings";

// Initialise settings
export const settings = default_settings;
const storedSettings = await GM.getValues(Object.keys(settings));
Object.assign(
    settings,
    storedSettings
);
GM.setValues(settings);

// Update script name so it takes up less space
const gm_info = GM.info
gm_info.script.name = "Advanced Interactive Street View"
gm_info.script.icon = null;

// Add the main panel
export const panel = new Panel("AISV", settings, gm_info);