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

function loadKMLtext(text: string) {
    const dom = new DOMParser().parseFromString(text, "text/xml");
    const storage : KMLstorage = {
        name: dom.querySelector("Document > name").innerHTML,
        enabled: true,
        features: kml(dom).features,
    }
    const storage_id = crypto.randomUUID();
    settings.kml[storage_id] = storage;
    GM.setValues(settings);
    setKMLkeys(Object.keys(settings.kml));
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
    });
    ml_map.moveLayer("kml-points", "label_other");

    // Update the map when the loaded KML files change
    createEffect(() => {
        const collection = {
            'type': 'FeatureCollection' as const,
            'features': []
        }
        for (const index of KMLkeys()) {
            if (settings.kml[index].enabled) {
                collection.features.push(...settings.kml[index].features);
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
const [KMLkeys, setKMLkeys] = createSignal(Object.keys(settings.kml));

const KMLRow = (props) => {
    return (
        <div class={styles['settings-item']}>
            <div class={styles['setting']}>
                <input
                    type="checkbox"
                    checked={settings.kml[props.id].enabled}
                    class={IRF.ui.panel.styles.toggle}
                    onChange={(e) => {
                        settings.kml[props.id].enabled = e.currentTarget.checked;
                        setKMLkeys(Object.keys(settings.kml));
                        GM.setValues(settings);
                    }}
                />
            </div>
            <span class={styles['setting']}>{settings.kml[props.id].name}</span>
            <div class={styles['setting']}>
                <button
                    onclick={() => {
                        delete settings.kml[props.id];
                        setKMLkeys(Object.keys(settings.kml));
                        GM.setValues(settings);
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