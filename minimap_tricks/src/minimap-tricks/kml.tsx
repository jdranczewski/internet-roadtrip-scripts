import * as IRF from 'internet-roadtrip-framework'
import { vmap } from './awaits';
import { render } from 'solid-js/web';
import styles from './settings/settings.module.css';
import { marker_panel, settings } from './settings/settings';
import { kml } from "@tmcw/togeojson";
import { createEffect, createSignal, For, Show } from 'solid-js';
import { type GeoJSONSource } from 'maplibre-gl';

interface KMLstorage {
    name: string,
    enabled: boolean,
    features,
    url?: string,
    lastUpdated?: number,
    lastChecked?: number,
    hash?: number
}

type StoredKML = {
    [key: string]: KMLstorage;
};

// Hashing function from https://stackoverflow.com/a/7616484
const generateHash = (string) => {
  let hash = 0;
  for (const char of string) {
    hash = (hash << 5) - hash + char.charCodeAt(0);
    hash |= 0; // Constrain to 32bit integer
  }
  return hash;
};

// Store and retrieve this separately from the settings object,
// as otherwise all actions involving saving the settings object
// become quite slow
let _stored_kml: StoredKML = GM_getValue("kml");
if (!_stored_kml) {
    _stored_kml = {};
    GM.setValues({kml: _stored_kml});
}
const stored_kml = _stored_kml;
async function loadKMLtext(text: string, storage_id?, source_url?) {
    try {
        setKMLstatus("parsing KML file...");
        // Generate hash and check with the one already stored
        const hash = generateHash(text);
        if (storage_id && stored_kml[storage_id]?.hash === hash) {
            setKMLstatus("no update found");
            stored_kml[storage_id].lastChecked = Date.now();
            GM.setValues({kml: stored_kml});
            setSolidKeys();
            return;
        };

        // Check if this is a "keep up to date" KML
        const dom = new DOMParser().parseFromString(text, "text/xml");
        if (dom.querySelector('parsererror')) {
            throw new Error("XML parse error");
        }
        const hrefNode = dom.querySelector("Document > NetworkLink > Link > href")
        if (hrefNode) {
            loadKMLurl(hrefNode.childNodes[0].nodeValue, storage_id);
            return;
        }
        let name = dom.querySelector("Document > name")?.innerHTML;

        const features = kml(dom).features;

        // Support for random opacity for areas
        features.forEach((feature) => {
            feature.properties.random = Math.random();
        })

        // Store the features in extension storage
        if (!storage_id) {
            if (!name) {
                name = (
                    marker_panel.container.getElementsByClassName("mmt-kml-file-selector")[0] as HTMLInputElement
                ).files[0].name;
            }
            storage_id = crypto.randomUUID();
            stored_kml[storage_id] = {
                name,
                enabled: true,
                features: features,
            };
            setKMLstatus(`${stored_kml[storage_id].name} loaded`);
        } else {
            if (name) stored_kml[storage_id].name = name;
            stored_kml[storage_id].features = features;
            setKMLstatus(`${stored_kml[storage_id].name} updated`);
        }
        stored_kml[storage_id].lastUpdated = Date.now();
        stored_kml[storage_id].hash = hash;
        if (source_url) {
            stored_kml[storage_id].url = source_url;
            stored_kml[storage_id].lastChecked = Date.now();
        };
        
        GM.setValues({kml: stored_kml});
        setSolidKeys();
    } catch (error) {
        setKMLstatus(error);
        console.error(error);
    }
}

async function loadKMLurl(url: string, storage_id?) {
    setKMLstatus("downloading KML file...");
    
    // Handle Google My Maps links
    if (
        url.includes("https://www.google.com/maps/d/edit")
        || url.includes("https://www.google.com/maps/d/viewer")
        || url.match("https://www.google.com/maps/d/u/[0-9]/edit")
        || url.match("https://www.google.com/maps/d/u/[0-9]/viewer")
    ) {
        const urlObject = new URL(url);
        const mid = urlObject.searchParams.get("mid");
        url = `https://www.google.com/maps/d/u/0/kml?forcekml=1&mid=${mid}`;
    }

    GM.xmlHttpRequest({
        method: "GET",
        url: url,
        onload: async (response) => {
            if (response.status !== 200) {
                setKMLstatus("Error retrieving URL");
                return;
            }
            const result = response.responseText;
            loadKMLtext(result, storage_id, url);
        },
    });
}

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
            'circle-opacity': parseFloat(settings.kml_points_opacity),
            'circle-stroke-opacity': parseFloat(settings.kml_points_opacity)
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
            'line-dasharray': settings.kml_lines_dashed ? [3, 2] : [1],
            'line-opacity': parseFloat(settings.kml_lines_opacity)
        },
        filter: ['in', '$type', 'LineString'],
    });
    ml_map.addLayer({
        id: 'kml-shapes',
        type: 'fill',
        source: 'kml_points',
        paint: {
            'fill-color': [
                'let',
                'colour', ['to-rgba', ['get', 'fill']],
                [
                    'rgba',
                    ['at', 0, ['var', 'colour']],
                    ['at', 1, ['var', 'colour']],
                    ['at', 2, ['var', 'colour']],
                    ['*', parseFloat(settings.klm_shapes_opacity), ['-', 1, ['*', 0.4, ['get', 'random']]]]
                ]
            ],
            'fill-outline-color': [
                'let',
                'colour', ['to-rgba', ['get', 'stroke']],
                [
                    'rgba',
                    ['at', 0, ['var', 'colour']],
                    ['at', 1, ['var', 'colour']],
                    ['at', 2, ['var', 'colour']],
                    parseFloat(settings.klm_shapes_outline_opacity),
                ]
            ],
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
        for (const [index,] of KMLkeys()) {
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

    // Check for updates to the KML files
    if (settings.kml_update_check) {
        const now = Date.now()
        Object.keys(stored_kml).forEach((key) => {
            if (
                stored_kml[key].enabled &&
                stored_kml[key]?.url &&
                (!stored_kml[key]?.lastChecked || now - stored_kml[key]?.lastChecked > 43200000)
            ) loadKMLurl(stored_kml[key].url, key);
        })
    }
});

// Settings
const section = marker_panel.add_section("KML layers", `For more complex maps,
    you can use <a href="https://mymaps.google.com/" target="_blank">Google My Maps</a>
    or another map creation tool to create KML files with many markers. You can then
    add your KML files here to show them on the in-game map!<br><br>
    Make sure you download as KML and not KMZ, and do select "keep data up to date" if
    you would like the option to automatically update the layer when the source map changes.<br><br>
    You can also add a map using a link to a KML file or to a Google My Maps map.`)

const import_item =
    <div class={styles['settings-item']}>
        <span class={styles['setting']}>Import KML file:</span>
        <hr />
        <div class={styles['setting']}>
            <input
                type="file"
                accept=".kml"
                class="mmt-kml-file-selector"
                onchange={(event) => {
                    // Adapted from https://developer.mozilla.org/en-US/docs/Web/API/FileReader#examples
                    const file = event.target.files[0];
                    
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

section.add_button("Import KML from URL", () => {
    const url = prompt("Paste the URL of your KML file here:");
    if (url) loadKMLurl(url);
});
section.add_checkbox("Check enabled layers for updates every 12 hours", "kml_update_check")

// Solid magic to support managing multiple files
function generateSolidKeys() {
    return Object.entries(stored_kml).map(([key, value]) => {
        return [key, value.hash]
    })
}
const [KMLkeys, setKMLkeys] = createSignal(generateSolidKeys());
function setSolidKeys() {
    setKMLkeys(generateSolidKeys());
}
function padNumber(number, pad) {
    return String(number).padStart(pad, '0');
}
function numberToDate(number) {
    if (!number) return "";
    const date = new Date(number);
    return (
        `${date.getFullYear()}/${padNumber(date.getMonth()+1, 2)}/${padNumber(date.getDate(), 2)} - ` +
        `${padNumber(date.getHours(), 2)}:${padNumber(date.getMinutes(), 2)}`
    )
}

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
                        setSolidKeys();
                        GM.setValues({kml: stored_kml});
                    }}
                />
            </div>
            <span class={styles['setting']}>
                {stored_kml[props.id].name}&nbsp;
                <Show when={stored_kml[props.id].lastUpdated}>
                    <span 
                        innerText={"- " + numberToDate(stored_kml[props.id].lastUpdated)}
                        class={styles['sidenote']}
                        title={
                            stored_kml[props.id].lastChecked ?
                            "Last update check: " + numberToDate(stored_kml[props.id].lastChecked)
                            : "Last updated"
                        }
                    />
                </Show>
            </span>
            <div class={styles['setting']}>
                <Show when={stored_kml[props.id].url}>
                    <button
                        onclick={() => {
                            loadKMLurl(stored_kml[props.id].url, props.id);
                        }}
                    >Update</button>&nbsp;
                </Show>
                <button
                    onclick={() => {
                        delete stored_kml[props.id];
                        setSolidKeys();
                        GM.setValues({kml: stored_kml});
                    }}
                >Remove</button>
            </div>
        </div>
    )
}

const [KMLstatus, setKMLstatus] = createSignal("");
const list_item =
    <>
        <div class={styles['setting']}>
            KML layers: <span
                innerText={ KMLstatus() }
                class={styles['sidenote']}
            />
        </div>
        <For each={KMLkeys()}>
            {(item) => (
                <KMLRow id={item[0]} />
            )}
        </For>
    </>    

render(() => list_item, section.container);

const section_styling = marker_panel.add_section("KML layer appearance", `Adjust the opacities
    of the various KML objects. The lines are dashed by default to distinguish them from
    everything else on the map, and the areas appear with slightly varying opacities to
    distinguish them when close together.`);

section_styling.add_checkbox("KML lines dashed", "kml_lines_dashed", (value) => {
    ml_map.setPaintProperty("kml-lines", 'line-dasharray', value ? [3, 2] : [1])
})

section_styling.add_slider("KML marker opacity", "kml_points_opacity", (value) => {
    ml_map.setPaintProperty("kml-points", "circle-opacity", parseFloat(value));
    ml_map.setPaintProperty("kml-points", 'circle-stroke-opacity', parseFloat(value));
}, [0, 1, 0.05])
section_styling.add_slider("KML lines opacity", "kml_lines_opacity", (value) => {
    ml_map.setPaintProperty("kml-lines", "line-opacity", parseFloat(value));
}, [0, 1, 0.05])
section_styling.add_slider("KML shape opacity", "klm_shapes_opacity", (value) => {
    ml_map.setPaintProperty("kml-shapes", "fill-color", [
        'let',
        'colour', ['to-rgba', ['get', 'fill']],
        [
            'rgba',
            ['at', 0, ['var', 'colour']],
            ['at', 1, ['var', 'colour']],
            ['at', 2, ['var', 'colour']],
            ['*', parseFloat(value), ['-', 1, ['*', 0.4, ['get', 'random']]]]
        ]
    ]);
}, [0, 1, 0.05])
section_styling.add_slider("KML shape outline opacity", "klm_shapes_outline_opacity", (value) => {
    ml_map.setPaintProperty("kml-shapes", 'fill-outline-color', [
        'let',
        'colour', ['to-rgba', ['get', 'stroke']],
        [
            'rgba',
            ['at', 0, ['var', 'colour']],
            ['at', 1, ['var', 'colour']],
            ['at', 2, ['var', 'colour']],
            parseFloat(value),
        ]
    ]);
}, [0, 1, 0.05])