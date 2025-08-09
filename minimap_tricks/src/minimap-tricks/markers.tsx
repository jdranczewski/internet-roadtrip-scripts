import {settings, marker_panel} from './settings/settings'
import { control } from './controlmenu'
import * as IRF from 'internet-roadtrip-framework'
import styles from './settings/settings.module.css'
import { render } from "solid-js/web";
import { createEffect, createSignal } from 'solid-js';

const maplibre = await IRF.modules.maplibre;
const vmap = await IRF.vdom.map;
const ml_map = vmap.data.map;

// In memory marker storage
export const markers = {};
(unsafeWindow as any)._MMT_getMarkers = () => {
    return markers;
}

class MMTMarker extends maplibre.Marker {
    _mmt_id: string;
    
    _mmt_remove() {
        delete settings.markers[this._mmt_id];
        delete markers[this._mmt_id];
        GM.setValues(settings);
        this.remove();
    }
}

async function add_marker(lat: number, lng: number, marker_id?: string, color?: string) {
    const marker = new MMTMarker({
        draggable: settings.draggable_markers,
        scale: 0.8,
        color: color ? color : settings.marker_color
    })
        .setLngLat([lng, lat])
        .addTo(ml_map);

    if (!marker_id) {
        marker_id = crypto.randomUUID();
        settings.markers[marker_id] = [lat, lng, {}];
        GM.setValues(settings);
    }
    marker._mmt_id = marker_id;
    markers[marker_id] = marker;

    marker.on("dragend", (e) => {
        const lngLat = marker.getLngLat();
        settings.markers[marker_id][0] = lngLat.lat;
        settings.markers[marker_id][1] = lngLat.lng;
        GM.setValues(settings);
    });

    marker.getElement().addEventListener("contextmenu", (f) => {
        f.stopPropagation();
        f.preventDefault();

        const colour = marker.getElement().children[0].children[0].children[1].getAttribute("fill");
        mcol_input.value = colour;

        const lngLat = marker.getLngLat();
        control.openMenu(
            "Marker", lngLat.lat, lngLat.lng,
            f.clientX, f.clientY, marker
        );
    });
}

// Add the markers from extension storage
for (const [marker_id, value] of Object.entries(settings.markers)) {
    add_marker(value[0], value[1], marker_id, value[2].color);
}

// Basic context menu options
const marker_icon_base = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%22-5%20-6%2037%2036%22%20stroke-width%3D%221.5%22%20stroke%3D%22currentColor%22%20class%3D%22size-6%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M15%2010.5a3%203%200%201%201-6%200%203%203%200%200%201%206%200%22%2F%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%2010.5c0%207.142-7.5%2011.25-7.5%2011.25S4.5%2017.642%204.5%2010.5a7.5%207.5%200%201%201%2015%200%22%2F%3E";

control.addButton(
    marker_icon_base + "%3Cpath%20d%3D%22M19%2021h8m-4-4v8%22%2F%3E%3C%2Fsvg%3E",
    "Add marker",
    async (c) => {
        add_marker(c.lat, c.lng);
    },
    ["Side", "Car", "Map"],
    {side_visible_default: false}
);

control.addButton(
    marker_icon_base + "%3Cpath%20d%3D%22M20%2018l6%206m-6%200l6%20-6%22%2F%3E%3C%2Fsvg%3E",
    "Remove marker",
    async (c) => {
        c.data._mmt_remove();
    },
    ["Marker"]
);

// Draggable markers
const draggable_meta = control.addButton(
    "",
    "Draggable markers",
    (c) => {
        settings.draggable_markers = !settings.draggable_markers;
        GM.setValues(settings);
        draggable_checkbox.checked = settings.draggable_markers;
        for (const [marker_id, marker] of Object.entries(markers)) {
            (marker as MMTMarker).setDraggable(settings.draggable_markers);
        }
    },
    ["Marker"]
)
const draggable_checkbox = document.createElement("input");
draggable_checkbox.type = "checkbox";
draggable_checkbox.checked = settings.draggable_markers;

draggable_meta.context_icon.appendChild(draggable_checkbox);
draggable_meta.context_icon.classList.add("mmt-draggable-checkbox-icon")

// Marker colour
const dropper_svg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-6 -6 36 36" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="m15 11.25 1.5 1.5.75-.75V8.758l2.276-.61a3 3 0 1 0-3.675-3.675l-.61 2.277H12l-.75.75 1.5 1.5M15 11.25l-8.47 8.47c-.34.34-.8.53-1.28.53s-.94.19-1.28.53l-.97.97-.75-.75.97-.97c.34-.34.53-.8.53-1.28s.19-.94.53-1.28L12.75 9M15 11.25 12.75 9"/></svg>';
control.addButton(
    `data:image/svg+xml,${encodeURIComponent(dropper_svg)}`,
    "Set color",
    (c) => {mcol_input.click()},
    ["Marker"]
)
const mcol_input = document.createElement("input");
mcol_input.type = "color";
mcol_input.id = "mmt-menu-color";
mcol_input.addEventListener("input", (e) => {
    if (control.data) {
        control.data.getElement().children[0].children[0].children[1].setAttribute(
            "fill", mcol_input.value
        );
        settings.markers[control.data._mmt_id][2].color = mcol_input.value;
        GM.setValues(settings);
    }
})

// Marker settings
const section = marker_panel.add_section("User markers", `You can add and remove
    your own markers by right-clicking the minimap.`)
{
    const [color, setColor] = createSignal(settings.marker_color);
    createEffect(() => {
        settings.marker_color = color();
        GM.setValues(settings);
    })
    const item =
    <div class={styles['settings-item']}>
        <span class={styles['setting']}>Default marker colour:</span>
        <input
            style="width: 100%;"
            type='color'
            value={color()}
            onchange={(e) => setColor(e.target.value)}
        />
        <button
            class={styles['setting']}
            onclick={() => setColor("#f7a000")}
        >Reset</button>
    </div>
    render(() => item, section.container);
}

section.add_button(
    "Remove all markers",
    () => {
        for (const [marker_id, marker] of Object.entries(markers)) {
            (marker as MMTMarker)._mmt_remove();
        }
    }
);