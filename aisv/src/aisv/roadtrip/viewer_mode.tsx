import { dcontainer } from './awaits';
import { settings, panel } from './settings';

panel.add_wide_comment(`Viewer mode removes all UI apart from the panorama and the map. Press your pause shortcut key
    (defined above) to temporarily pause viewer mode.`);

panel.add_checkbox("Viewer mode", "viewer_mode", (value) => {
    dcontainer.classList.toggle("aisv-viewer-mode", value);

    settings.viewer_mode = false;
    console.log(value, settings.viewer_mode);
    GM.setValues(settings);
})