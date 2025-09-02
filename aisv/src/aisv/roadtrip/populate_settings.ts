import { messenger } from "./iframe";
import { panel } from "./settings";

const section = panel.add_section("Movement animations");
const fadeOptions: [string, string][] = [
    ["No fade", ""],
    ["Slightly", "aBitFiltered"],
    ["Fully", "filtered"]
]
section.add_dropdown("Fade during smooth transitions", "fadeSmoothTransitions", fadeOptions, (value) => {
    messenger.send("settingChanged", {
        identifier: "fadeSmoothTransitions",
        value: value
    })
}, "aBitFiltered")
section.add_dropdown("Fade during sharp transitions", "fadeSharpTransitions", fadeOptions, (value) => {
    messenger.send("settingChanged", {
        identifier: "fadeSharpTransitions",
        value: value
    })
}, "filtered")
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