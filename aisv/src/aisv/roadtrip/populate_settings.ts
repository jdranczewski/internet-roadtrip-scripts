import { messenger } from "./iframe";
import { panel } from "./settings";

const fade_section = panel.add_section("Animations between locations", `When the car location changes,
we try to make the transition smooth by applying a slight or full fade.<br><br>
If the new location is nearby, there will be a "whoosh" animation between the two panoramas,
which we call a "smooth" transition. By default, we blur these slightly to obscure any artefacts.
<br><br>
If the new location is not connected or further away, there will be a sharp jump between the two,
which we call a "sharp" transition. By default, we fade the pano out fully, and then back in, to
obscure the sharp changeover.
`)
const fadeOptions: [string, string][] = [
    ["No fade", ""],
    ["Slightly", "aBitFiltered"],
    ["Fully", "filtered"]
]
fade_section.add_dropdown("Fade during smooth transitions", "fadeSmoothTransitions", fadeOptions, (value) => {
    messenger.send("settingChanged", {
        identifier: "fadeSmoothTransitions",
        value: value
    })
}, "aBitFiltered")
fade_section.add_dropdown("Fade during sharp transitions", "fadeSharpTransitions", fadeOptions, (value) => {
    messenger.send("settingChanged", {
        identifier: "fadeSharpTransitions",
        value: value
    })
}, "filtered")
fade_section.add_wide_comment(`When we are going along a straight road, the game will often jump multiple
panoramas at a time, which creates a sharp transition. We make this into a smooth transition by executing
multiple jumps between the two panoramas, which creates smoother, but longer animation.`)
fade_section.add_checkbox("Animate multiple smooth transitions for longer jumps", "animateFurtherStraights", (value) => {
    messenger.send("settingChanged", {
        identifier: "animateFurtherStraights",
        value: value
    })
});
fade_section.add_wide_comment(`To avoid small, jarring jumps in heading, rotation is only animated if
the car turns by a high enough angle from where the viewer is currently pointed. You can change
this threshold here`);
fade_section.add_slider("Angle difference threshold for animation", "turnThreshold", (value) => {
    messenger.send("settingChanged", {
        identifier: "turnThreshold",
        value: value
    })
}, [0, 20, 1]);

const key_section = panel.add_section("Keyboard shortcuts", `Press space (" " here) to reset the view
to the "official" one, and escape to pause/unpause the view - good for taking screenshots,
especially on straight roads where the view changes often! You can also use the buttons on the
left of the radio for this.<br><br>
Check <a href="https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values"
target="_blank">here</a> for a list of possible key values (they should be fairly intuitive).
`)
key_section.add_input("Pause key", "pauseKey", "text", (value) => {
    messenger.send("settingChanged", {
        identifier: "pauseKey",
        value: value
    })
}, "Escape");
key_section.add_input("Reset view key", "resetViewKey", "text", (value) => {
    messenger.send("settingChanged", {
        identifier: "resetViewKey",
        value: value
    })
}, " ");

const performance_section = panel.add_section("Performance", `You can adapt the game's look
and potentially improve its performance by making the resolution smaller. Note that if
you enable scaling back to the full window, zooming and dragging may work weirdly.
`)
performance_section.add_slider("Street View window render scale", "scale", (value) => {
    messenger.send("settingChanged", {
        identifier: "scale",
        value: value
    })
}, [0, 100, 1]);
performance_section.add_checkbox("Fill window", "fill", (value) => {
    messenger.send("settingChanged", {
        identifier: "fill",
        value: value
    })
});