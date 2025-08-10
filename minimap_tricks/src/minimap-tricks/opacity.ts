import * as IRF from 'internet-roadtrip-framework';
import { settings, panel } from "./settings/settings";
import { mapIsFullscreen } from './fullscreen';
import { control } from './controlmenu';
import { type MapSourceDataEvent } from 'maplibre-gl';

export const section = panel.add_section("Map appearance", `Change the the opacity of
    map elements here. You can use the sliders below to make the map mostly transparent,
    or even set it so that only the streets are visible unless you put your mouse over it!`);

const vmap = await IRF.vdom.map;
const ml_map = vmap.data.map;
const mapContainerEl = await IRF.dom.map;

// Map background layer opacity
export function setLayerOpacity(value=undefined) {
    if (!value) {
        value = vmap.data.isExpanded ? settings.background_opacity_expanded : settings.background_opacity;
    }
    value = parseFloat(value);
    ml_map.setPaintProperty("background", "background-opacity", value);
    ml_map.setPaintProperty("water", "fill-opacity", value);
}

declare global {
    interface Window {
        documentPictureInPicture?: any;
    }
}

// Hide the menu and change background opacities when netux's PIP exits/enters
let inPIP = false;
if (window.documentPictureInPicture) {
    window.documentPictureInPicture.addEventListener("enter", (e) => {
        setLayerOpacity(1);
        inPIP = true;
        e.window.addEventListener("pagehide", (f) => {
            control._hide_menu();
            setLayerOpacity();
            inPIP = false;
        });
    })
}

// Map element opacity
mapContainerEl.style.opacity = settings.map_opacity;
mapContainerEl.style.setProperty('--map-opacity-expanded', settings.map_opacity_expanded);

// Set the route opacity
ml_map.once('load', () => {
    // Messing with styles should only happen once map is ready
    ml_map.setPaintProperty("route", "line-opacity", parseFloat(settings.route_opacity));
    setLayerOpacity();

    // Full layer opacity when mouse over the map
    mapContainerEl.addEventListener("mouseenter", (e) => {
        if (inPIP || mapIsFullscreen) return;
        setLayerOpacity(1);
    });
    mapContainerEl.addEventListener("mouseleave", (e) => {
        if (inPIP || mapIsFullscreen) return;
        setLayerOpacity();
    });
});

// Full opacity when map is in fullscreen
mapContainerEl.addEventListener("toggleFullscreenMap", () => {
    console.log("setting map opacity!")
    setLayerOpacity(mapIsFullscreen ? 1 : undefined);
})

// Set the old route opacity once it's added
const old_route_subscription = ml_map.on("data", (e: MapSourceDataEvent) => {
    if (e.sourceId == "old-route") {
        ml_map.setPaintProperty("old-route-layer", "line-opacity", parseFloat(settings.route_opacity));
        ml_map.moveLayer("old-route-layer", "boundary_3");
        old_route_subscription.unsubscribe();
    }
})

// Settings
section.add_slider("Collapsed map opacity", "map_opacity", (value) => {
    mapContainerEl.style.opacity = value;
}, [0, 1, 0.05]);
section.add_slider("Collapsed map background opacity", "background_opacity", (value) => {
    if (!vmap.data.isExpanded) setLayerOpacity(value);
}, [0, 1, 0.05]);
section.add_slider("Expanded map opacity", "map_opacity_expanded", (value) => {
    mapContainerEl.style.setProperty('--map-opacity-expanded', value);
}, [0, 1, 0.05]);
section.add_slider("Expanded map background opacity", "background_opacity_expanded", (value) => {
    if (vmap.data.isExpanded) setLayerOpacity(value);
}, [0, 1, 0.05]);
section.add_slider("Route opacity", "route_opacity", (value) => {
    ml_map.setPaintProperty("route", "line-opacity", parseFloat(value));
    ml_map.setPaintProperty("old-route-layer", "line-opacity", parseFloat(value));
}, [0, 1, 0.05]);