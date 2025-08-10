import {settings, panel} from './settings/settings'
import * as IRF from 'internet-roadtrip-framework'
import {type FlyToOptions} from 'maplibre-gl'
import { control } from './controlmenu'
import { mapIsFullscreen } from './fullscreen'
import { measure } from './distance'

const section = panel.add_section("Map position", `The map will follow the car by default.
    You can change how (and if) this happens here.`)

section.add_checkbox("Re-centre map on the car after a timeout", "timeout_centre");
section.add_checkbox("Disable re-centring when map is in fullscreen", "timeout_centre_fullscreen_disable");
section.add_checkbox("Align map orientation with the car", "align_orientation");
section.add_checkbox("Reset zoom when the map re-centres", "reset_zoom");
section.add_slider("Default map zoom", "default_zoom");

const vcontainer = await IRF.vdom.container
const vmap = await IRF.vdom.map;
const ml_map = vmap.data.map;

// First flight will always want to be to the default zoom level
// So we need to figure out if said first flight has been achieved
let first_fly = true;
const zoom_subscription = ml_map.on("moveend", () => {
    if (Math.abs(ml_map.getZoom() - settings.default_zoom) < 0.2) {
        first_fly = false;
        zoom_subscription.unsubscribe();
    }
})

// General function for flying the map to a location
let latestBearing = 0;
export function flyTo(coords?: number[], bearing?: number, interactionOverride: boolean=true) {
    const args: FlyToOptions = {
        essential: !0,
    }
    if (coords) {
        args.center = [coords[1], coords[0]];
    }
    if (bearing) {
        args.bearing = bearing;
        latestBearing = bearing;
    } else if (settings.align_orientation) {
        args.bearing = latestBearing;
    }
    if (first_fly || settings.reset_zoom) {
        args.zoom = settings.default_zoom;
    }
    ml_map.flyTo(args, {interactionOverride: interactionOverride});
}

// Disable the default map reset function
// so we can implement our own logic for when this should happen
vmap.state.flyTo = new Proxy(vmap.methods.flyTo, {
    apply: () => {},
});

// Proxy the user interaction handling to not include flyTo calls
// that have the interactionOverride flag
ml_map.off("dragstart", vmap.methods.handleUserInteraction);
ml_map.off("zoomstart", vmap.methods.handleUserInteraction);
vmap.state.handleUserInteraction = new Proxy(vmap.methods.handleUserInteraction, {
    apply: (target, thisArg, args) => {
        if (!args[0]?.interactionOverride) {
            return Reflect.apply(target, thisArg, args);
        }
    },
});
// Rebind event handlers so that they use the proxied method
ml_map.on("dragstart", vmap.methods.handleUserInteraction);
ml_map.on("zoomstart", vmap.methods.handleUserInteraction);
ml_map.on("rotatestart", vmap.methods.handleUserInteraction);


export function checkUpdateMap() {
    return (
        (Date.now() - vmap.data.lastUserInteraction > 30000)
        && ((
            settings.timeout_centre
            && (!mapIsFullscreen || !settings.timeout_centre_fullscreen_disable )
        ) || vmap.data.lastUserInteraction == 0)
    )
}

let prevPos = [0, 0];
vmap.data.marker.setLngLat = new Proxy(vmap.data.marker.setLngLat, {
    apply: (target, thisArg, args) => {
        // Sync map to the coordinates when the marker is updated
        // but only if the marker moved a significant distance compared to the tile size
        const map_lnglat = ml_map.getCenter();
        const diff = [
            Math.abs(args[0][0] - map_lnglat.lng),
            Math.abs(args[0][1] - map_lnglat.lat)
        ]
        const tile_width = 360/(2**ml_map.getZoom());
        const factor = 0.01;
        if (
            (diff[0] > tile_width*factor || diff[1] > tile_width*factor)
            && checkUpdateMap()
        ) {
            flyTo([args[0][1], args[0][0]])
        }

        // Update the distance measurement when the car's position changes
        // (this method is called on every websocket receive, so we filter it here)
        if (args[0][0] !== prevPos[0] || args[0][1] !== prevPos[1]) {
            measure.updateCar();
            prevPos = args[0];
        }

        return Reflect.apply(target, thisArg, args);
    }
})

// Add button for re-centring
control.addButton(
    "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23333' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E",
    "Centre",
    async (c) => {
        flyTo(
            [c.lat, c.lng],
            (settings.align_orientation && (c.context === "Side" || c.context === "Car")) ? vcontainer.data.currentHeading : undefined
        )
        if (c.context === "Side" || c.context === "Car") {
            vmap.state.lastUserInteraction = 0;
        }
    },
    ["Side", "Car", "Marker"]
);