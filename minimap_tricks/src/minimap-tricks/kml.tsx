import * as IRF from 'internet-roadtrip-framework'
import { render } from 'solid-js/web';
import styles from './settings/settings.module.css';
import { marker_panel, settings } from './settings/settings';
import { kml } from "@tmcw/togeojson";
import { createEffect, createSignal, For } from 'solid-js';
import { type GeoJSONSource } from 'maplibre-gl';

interface KMLstorage {
    name: string,
    enabled: boolean,
    features,
    url?: string,
    lastUpdated?: number,
}

// Store and retrieve this separately from the settings object,
// as otherwise all actions involving saving the settings object
// become quite slow
let stored_kml = GM_getValue("kml");
function loadKMLtext(text: string) {
    const dom = new DOMParser().parseFromString(text, "text/xml");
    const storage : KMLstorage = {
        name: dom.querySelector("Document > name").innerHTML,
        enabled: true,
        features: kml(dom).features,
    }
    const storage_id = crypto.randomUUID();
    stored_kml[storage_id] = storage;
    GM.setValues({kml: stored_kml});
    setKMLkeys(Object.keys(stored_kml));
}

const vmap = await IRF.vdom.map;
const ml_map = vmap.data.map;
const maplibre = await IRF.modules.maplibre;

// Add the source and layers to the map
ml_map.once("load", () => {
    ml_map.addSource('kml_points', {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection' as const,
            'features': []
        }
    });

    ml_map.addLayer({
        id: 'kml-points',
        type: 'circle',
        source: 'kml_points',
        paint: {
            'circle-radius': 5,
            'circle-color': ['get', 'icon-color'],
            'circle-stroke-color': "#fff",
            'circle-stroke-width': 2,
        },
        filter: ['in', '$type', 'Point']
    });
    ml_map.addLayer({
        id: 'kml-lines-outline',
        type: 'line',
        source: 'kml_points',
        layout: {
            'line-cap': 'round',
            'line-join': 'round'
        },
        paint: {
            'line-color': "#fff",
            'line-width': 2,
            'line-gap-width': 3,
            'line-opacity': .5
        },
        filter: ['in', '$type', 'LineString'],
    });
    ml_map.addLayer({
        id: 'kml-lines',
        type: 'line',
        source: 'kml_points',
        layout: {
            'line-cap': 'round',
            'line-join': 'round'
        },
        paint: {
            'line-color': ['get', 'stroke'],
            'line-width': 5,
            'line-dasharray': [3, 2]
        },
        filter: ['in', '$type', 'LineString'],
    });
    ml_map.addLayer({
        id: 'kml-shapes',
        type: 'fill',
        source: 'kml_points',
        paint: {
            'fill-color':[
                'let',
                'random', ['-', 0.8, ['/', ['sin', ["distance", {"type": "Point", "coordinates": [0, 0]}]], 5]],
                'colour', ['to-rgba', ['get', 'fill']],
                [
                    'rgba',
                    ['at', 0, ['var', 'colour']],
                    ['at', 1, ['var', 'colour']],
                    ['at', 2, ['var', 'colour']],
                    ['*', 1, ['var', 'random']]
                ]
            ],
            'fill-outline-color': ['get', 'stroke'],
        },
        filter: ['in', '$type', 'Polygon']
    });
    ml_map.moveLayer("kml-points", "label_other");
    ml_map.moveLayer("kml-lines", ml_map.getLayer("old-route-layer") ? "old-route-layer" : "route");
    ml_map.moveLayer("kml-lines-outline", "kml-lines");
    ml_map.moveLayer("kml-shapes", ml_map.getLayer("sv-tiles") ? "sv-tiles" : (
        ml_map.getLayer("old-route-layer") ? "old-route-layer" : "route"
    ));

    // Update the map when the loaded KML files change
    createEffect(() => {
        const collection = {
            'type': 'FeatureCollection' as const,
            'features': []
        }
        for (const index of KMLkeys()) {
            if (stored_kml[index].enabled) {
                collection.features.push(...stored_kml[index].features);
            }
        }
        (ml_map.getSource('kml_points') as GeoJSONSource).setData(collection);
    });

    // Popup code adapted from https://maplibre.org/maplibre-gl-js/docs/examples/display-a-popup-on-hover/
    const popup = new maplibre.Popup({
        closeButton: false,
        closeOnClick: false
    });

    let currentFeatureCoordinates = undefined;
    ml_map.on('mousemove', 'kml-points', (e) => {
        if (e.features[0].geometry.type === 'Point') {
            const featureCoordinates = e.features[0].geometry.coordinates.toString();
            if (currentFeatureCoordinates !== featureCoordinates) {
                currentFeatureCoordinates = featureCoordinates;

                const coordinates = e.features[0].geometry.coordinates;
                const description = e.features[0].properties.name;

                if (description.length > 0) popup.setLngLat([coordinates[0], coordinates[1]]).setHTML(description).addTo(ml_map);
            }
        }
    });

    ml_map.on('mouseleave', 'kml-points', () => {
        currentFeatureCoordinates = undefined;
        if (popup.isOpen()) popup.remove();
    });
});

// Settings
const section = marker_panel.add_section("KML layers", `For more complex maps,
    you can use <a href="https://mymaps.google.com/" target="_blank">Google My Maps</a>
    or another map creation tool to create KML files with many markers. You can then
    add your KML files here to show them on the in-game map!<br><br>
    Make sure you download as KML and not KMZ, and don't choose "keep data up to date".`)

const import_item =
    <div class={styles['settings-item']}>
        <span class={styles['setting']}>Import KML file:</span>
        <hr />
        <div class={styles['setting']}>
            <input
                type="file"
                accept=".kml"
                onchange={(event) => {
                    // Adapted from https://developer.mozilla.org/en-US/docs/Web/API/FileReader#examples
                    const file = event.target.files[0];
                    console.log(file);
                    
                    if (!file) {
                        alert("No file selected. Please choose a file.");
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = () => {
                        loadKMLtext(reader.result as string);
                    };
                    reader.onerror = () => {
                        alert("Error reading the file. Please try again.");
                    };

                    reader.readAsText(file);
                }}
            />
        </div>
    </div>

render(() => import_item, section.container);

// Solid magic to support managing multiple files
const [KMLkeys, setKMLkeys] = createSignal(Object.keys(stored_kml));

const KMLRow = (props) => {
    return (
        <div class={styles['settings-item']}>
            <div class={styles['setting']}>
                <input
                    type="checkbox"
                    checked={stored_kml[props.id].enabled}
                    class={IRF.ui.panel.styles.toggle}
                    onChange={(e) => {
                        stored_kml[props.id].enabled = e.currentTarget.checked;
                        setKMLkeys(Object.keys(stored_kml));
                        GM.setValues({kml: stored_kml});
                    }}
                />
            </div>
            <span class={styles['setting']}>{stored_kml[props.id].name}</span>
            <div class={styles['setting']}>
                <button
                    onclick={() => {
                        delete stored_kml[props.id];
                        setKMLkeys(Object.keys(stored_kml));
                        GM.setValues({kml: stored_kml});
                    }}
                >Remove</button>
            </div>
        </div>
    )
}

const list_item =
    <For each={KMLkeys()}>
        {(item) => (
            <KMLRow id={item} />
        )}
    </For>

render(() => list_item, section.container);