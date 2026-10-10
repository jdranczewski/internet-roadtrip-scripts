import * as IRF from 'internet-roadtrip-framework'
import { vmap } from './awaits';
import { settings, panel } from './settings/settings'

const ml_map = vmap.data.map;
const maplibre = await IRF.modules.maplibre;

// Add layers once the map is ready
ml_map.once("load", () => {
    actionCustomTiles();
})

function actionCustomTiles() {
    if (settings.show_custom_tiles && settings.custom_tile_source_url.length > 0) {
        if (ml_map.getSource("custom_tiles") === undefined) {
            ml_map.addSource("custom_tiles", {
                'type': 'raster',
                'tiles': [settings.custom_tile_source_url],
                'tileSize': 512,
                'minzoom': 0,
                'maxzoom': 22,
            });
            ml_map.addLayer({
                'id': 'custom_tiles',
                'type': 'raster',
                'source': 'custom_tiles',
                paint: {
                    "raster-opacity": parseFloat(settings.custom_tile_opactity),
                    "raster-contrast": parseFloat(settings.custom_tile_contrast),
                    "raster-saturation": parseFloat(settings.custom_tile_saturation)
                }
            }, "road_motorway_link_casing");
        }
        ml_map.setPaintProperty("building", "fill-opacity", parseFloat(settings.custom_tile_building_opacity));
        ml_map.setPaintProperty("building-3d", "fill-extrusion-opacity", parseFloat(settings.custom_tile_building_opacity));
        ml_map.setLayoutProperty("custom_tiles", "visibility", "visible");
        ml_map.setPaintProperty("road_secondary_tertiary", "line-opacity", 0.4);
        ml_map.setPaintProperty("road_minor", "line-opacity", 0.4);
        ml_map.setPaintProperty("road_link", "line-opacity", 0.4);
        ml_map.setPaintProperty("road_service_track", "line-opacity", 0.4);
        ml_map.setPaintProperty("road_path_pedestrian", "line-opacity", 0.4);
    } else {
        ml_map.setPaintProperty("building", "fill-opacity", 1);
        ml_map.setPaintProperty("building-3d", "fill-extrusion-opacity", 0.8);
        ml_map.setPaintProperty("road_secondary_tertiary", "line-opacity", 1.);
        ml_map.setPaintProperty("road_minor", "line-opacity", 1.);
        ml_map.setPaintProperty("road_link", "line-opacity", 1.);
        ml_map.setPaintProperty("road_service_track", "line-opacity", 1.);
        ml_map.setPaintProperty("road_path_pedestrian", "line-opacity", 1.);
        ml_map.setLayoutProperty("custom_tiles", "visibility", "none");
    }
}

// Settings
const section = panel.add_section("Custom raster tiles", `Display a custom tile source below the
    roads and markers on the map. This can be used to show a satellite map for example!`)

section.add_checkbox("Show custom tiles", "show_custom_tiles", actionCustomTiles);
section.add_input("Tile source URL (XYZ format)", "custom_tile_source_url", "text", (value) => {
    const source = ml_map.getSource("custom_tiles");
    if (source !== undefined && source instanceof maplibre.RasterTileSource) {
        source.setTiles([value]);
    };
});

section.add_wide_comment(`I can't directly provide an URL for you to use here, sorry! Here are some instructions
    on how to get your own though:
    <ul>
        <li>Sign into <a href="https://cloud.maptiler.com/" target="_blank">https://cloud.maptiler.com/</a> (easiest with Google).</li>
        <li>Under "API Keys" select "New key", include "neal.fun" under "Allowed HTTP Origins" and press "Create".</li>
        <li>My recommended satellite tiles are <a href="https://cloud.maptiler.com/tiles/satellite-v2/" target="_blank">
        https://cloud.maptiler.com/tiles/satellite-v2/</a> (in the "Tiles" section).</li>
        <li>On the tile page click the copy icon to the left of the XYZ tile URL field (the one that includes "{z}/{x}/{y}"),
        and choose your API key. The URL should now be in your clipboard.</li>
        <li>Paste the URL into the text field above!</li>
    </ul>
    You can also peruse <a href="https://cloud.maptiler.com/tiles/" target="_blank">https://cloud.maptiler.com/tiles/</a>
    or <a href="https://madewithmaplibre.com/basemaps/gallery/" target="_blank">
    https://madewithmaplibre.com/basemaps/gallery/</a> for other raster tile sources that may tickle your fancy!
    The tiles should not contain text or streets, as they will be shown as a background for the usual OpenStreetMap data.`);

function setPaintProperty(property: string, value) {
    if (ml_map.getLayer("custom_tiles") !== undefined) {
        ml_map.setPaintProperty("custom_tiles", property, parseFloat(value));
    }
}
section.add_slider("Opacity", "custom_tile_opactity", (value) => {
    setPaintProperty("raster-opacity", value)
}, [0, 1, 0.05]);
section.add_slider("Contrast", "custom_tile_contrast", (value) => {
    setPaintProperty("raster-contrast", value)
}, [-.5, .5, 0.05]);
section.add_slider("Saturation", "custom_tile_saturation", (value) => {
    setPaintProperty("raster-saturation", value)
}, [-.5, .5, 0.05]);
section.add_slider("Building opacity", "custom_tile_building_opacity", (value) => {
    if (settings.show_custom_tiles) {
        ml_map.setPaintProperty("building", "fill-opacity", parseFloat(value));
        ml_map.setPaintProperty("building-3d", "fill-extrusion-opacity", parseFloat(value));
    }
}, [0, 1, 0.05]);