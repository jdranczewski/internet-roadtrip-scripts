import { messenger } from "./iframe";
import { panel } from "./settings";

const fade_section = panel.add_section("Animations between locations", `When the car location changes,
two kinds of transitions can occur:
<ul>
    <li>If the new location is nearby, there will be a "whoosh" animation between the two panoramas,
which we call a <strong>"smooth"</strong> transition.</li>
    <li>If the new location is not connected or further away, there will be a sharp jump between the two,
    which we call a <strong>"sharp"</strong> transition.</li>
</ul>

By default, sharp transitions cross-fade like in the unmodded game, and smooth transitions are blurred
slightly to obscure any artefacts or loading pixelation. You can choose several levels of fade and blur
below, or enable cross-fades for both kinds of transition.<br><br>

The cross-fade setting may impact performance slightly, but should overall look much better!
Play around with the settings or poke @jakub on Discord if you have questions!
`)
const fadeOptions: [string, string][] = [
    ["No fade", ""],
    ["Slightly", "aBitFiltered"],
    ["Medium", "aBitMoreFiltered"],
    ["Fully", "filtered"],
    ["Cross-fade", "cross"],
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
}, "aBitFiltered")
fade_section.add_wide_comment(`When we are going along a straight road, the game will often jump multiple
panoramas at a time, which creates a sharp transition. We can make this into a smooth transition by executing
multiple jumps between the two panoramas, which creates smoother, but longer animations.`)
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

const ui_section = panel.add_section("UI", ``);
ui_section.add_checkbox("Rotate arrows as you pan", "rotateArrowsWithHeading", (value) => {
    messenger.send("settingChanged", {
        identifier: "rotateArrowsWithHeading",
        value: value
    })
});
