import { Panel } from "../../../../minimap_tricks/src/minimap-tricks/settings/settings_components";
import { default_settings } from "../default_settings";
import { messenger } from "./iframe";

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

// Add settings to panel
export const panel = new Panel("AISV", settings, gm_info);
const section = panel.add_section("Movement animations");
section.add_checkbox("Fade slightly during smooth transitions", "fadeSlightTransitions", (value) => {
    messenger.send("settingChanged", {
        identifier: "fadeSlightTransitions",
        value: value
    })
});
section.add_checkbox("Fade fully during non-smooth transitions", "fadeFullTransitions", (value) => {
    messenger.send("settingChanged", {
        identifier: "fadeFullTransitions",
        value: value
    })
});
section.add_checkbox("Animate multiple smooth transitions for longer jumps", "animateFurtherStraights", (value) => {
    messenger.send("settingChanged", {
        identifier: "animateFurtherStraights",
        value: value
    })
});
section.add_slider("Angle difference threshold for animation", "turnThreshold", (value) => {
    messenger.send("settingChanged", {
        identifier: "turnThreshold",
        value: value
    })
}, [0, 20, 1]);
section.add_input("Pause key", "pauseKey", "text", (value) => {
    messenger.send("settingChanged", {
        identifier: "pauseKey",
        value: value
    })
}, "Escape");
section.add_input("Reset view key", "resetViewKey", "text", (value) => {
    messenger.send("settingChanged", {
        identifier: "resetViewKey",
        value: value
    })
}, " ");
section.add_slider("Street View window render scale", "scale", (value) => {
    messenger.send("settingChanged", {
        identifier: "scale",
        value: value
    })
}, [0, 100, 1]);
section.add_checkbox("Fill window", "fill", (value) => {
    messenger.send("settingChanged", {
        identifier: "fill",
        value: value
    })
});