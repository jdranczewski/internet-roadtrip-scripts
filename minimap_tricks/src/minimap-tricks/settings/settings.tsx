import { Panel } from "./settings_components";

// Default settings
export const settings = {
    "expand_map": false,
    "default_zoom": 12.5,
    "timeout_centre": true,
    "timeout_centre_fullscreen_disable": false,
    "reset_zoom": false,
    "disable_fly_in": true,
    "disable_flying_animations": false,
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
    "map_opacity": "1",
    "background_opacity": "1",
    "map_opacity_expanded": "1",
    "background_opacity_expanded": "1",
    "marker_opacity": "1",
    "route_opacity": "1",
    "marker_color": "#f7a000",
    "markers": {},
    "draggable_markers": true,

    "car_marker_custom": false,
    "car_marker_size": 54,
    "car_marker_url": "https://jdranczewski.dev/irt/images/white_van.png",
    "car_marker_scale": 65,
    "car_marker_rotation": 90,
    "car_marker_flip": false,
    "car_marker_flip_x": false,

    "side_compass": false,

    "coverage": true,
    "coverage_opacity": "0.75",

    "kml_points_opacity": "1",
    "kml_lines_opacity": "1",
    "kml_lines_dashed": true,
    "klm_shapes_opacity": "0.8",
    "klm_shapes_outline_opacity": "0.8",
    "kml_update_check": true
}

// Initialise settings
const storedSettings = await GM.getValues(Object.keys(settings))
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
// Migrate van image from catbox to my server
if (settings.car_marker_url === "https://files.catbox.moe/a55qk5.png") {
    settings.car_marker_url = "https://jdranczewski.dev/irt/images/white_van.png"
}
GM.setValues(settings);

// Update script name so it takes up less space
const gm_info = GM.info
gm_info.script.name = "Minimap tricks"
gm_info.script.icon = null;

export const panel = new Panel("Minimap", settings, gm_info);
export const marker_panel = new Panel("Map markers", settings, gm_info);