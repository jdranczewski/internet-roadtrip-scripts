import * as IRF from 'internet-roadtrip-framework'
import styles, {stylesheet} from './settings.module.css'
import { render } from "solid-js/web";

// Default settings
export const settings = {
    "expand_map": false,
    "default_zoom": 12.5,
    "timeout_centre": true,
    "timeout_centre_fullscreen_disable": false,
    "reset_zoom": false,
    "align_orientation": false,
    "show_scale": true,
    "km_units": false,
    "decimal_units": false,
    "coordinates_fancy": false,
    "map_size": {
        width: undefined,
        height: undefined,
        expanded_width: undefined,
        expanded_height: undefined
    },
    "map_opacity": 1,
    "background_opacity": 1,
    "map_opacity_expanded": 1,
    "background_opacity_expanded": 1,
    "marker_opacity": 1,
    "route_opacity": 1,
    "marker_color": "#f7a000",
    "markers": {},
    "draggable_markers": true,

    "car_marker_custom": false,
    "car_marker_size": 54,
    "car_marker_url": "https://files.catbox.moe/a55qk5.png",
    "car_marker_scale": 65,
    "car_marker_rotation": 90,
    "car_marker_flip": false,
    "car_marker_flip_x": false,

    "side_compass": false,
    "side_Go to coordinates": false,
    "side_Go to and mark coordinates": false,
    "side_Copy coordinates": false,
    "side_Measure distance": false,
    "side_Open Street View": true,
    "side_Open SV coverage map": true,
    "side_Add marker": false,
    "side_Centre": true,

    "coverage": true,
    "coverage_opacity": 0.75,
}

// Initialise settings
const storedSettings = GM_getValues(Object.keys(settings))
Object.assign(
    settings,
    storedSettings
);
// Migrate stored markers to the new format
Object.entries(settings.markers).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length == 2) {
        settings.markers[key] = [value[0], value[1], {}]
    } else if (typeof value[2] === 'string' || value[2] instanceof String) {
        settings.markers[key] = [value[0], value[1], {color: value[2]}]
    }
});
GM_setValues(settings);

// Update script name so it takes up less space
let gm_info = GM.info
gm_info.script.name = "Minimap tricks"

// Wrapper around IRF panel
export class Panel {
    name: string;
    _irf_settings: {
        container: HTMLDivElement;
    }
    container: HTMLDivElement;

    constructor(name: string) {
        this.name = name;
        this._irf_settings = IRF.ui.panel.createTabFor(
            gm_info, {
                tabName: name,
                style: stylesheet
            }
        );
        this.container = this._irf_settings.container;
    }

    add_checkbox(
        name: string, identifier: string,
        callback: CallableFunction=undefined
    ) {
        const item =
        <div class={styles['settings-item']}>
            <span class={styles['setting']}>{name}</span>
            <hr />
            <div class={styles['setting']}>
                <input
                    type="checkbox"
                    checked={settings[identifier]}
                    class={IRF.ui.panel.styles.toggle}
                    onChange={(e) => {
                        settings[identifier] = e.currentTarget.checked;
                        GM.setValues(settings);
                        if (callback) callback(e.currentTarget.checked);
                    }}
                />
            </div>
        </div>
        render(() => item, this.container);
    }
}