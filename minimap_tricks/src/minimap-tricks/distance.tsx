import * as IRF from 'internet-roadtrip-framework';
import { type GeoJSONSource, type IControl, type Map } from 'maplibre-gl';
import { length, distance } from '@turf/turf';
import { Properties } from 'solid-js/web';
import { control } from './controlmenu';

const trash_svg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="size-6" viewBox="-6 -6 36 36"><path stroke-linecap="round" stroke-linejoin="round" d="m14.7 9-.3 9m-4.8 0-.3-9m10-3.2 1 .2m-1-.2-1.1 13.9a2.3 2.3 0 0 1-2.3 2H8.1a2.3 2.3 0 0 1-2.3-2l-1-14m14.4 0a48.1 48.1 0 0 0-3.4-.3M3.8 6l1-.2m0 0a48.1 48.1 0 0 1 3.5-.4m7.5 0v-1c0-1.1-1-2-2.1-2.1a52 52 0 0 0-3.4 0c-1.1 0-2 1-2 2.2v.9m7.5 0a48.7 48.7 0 0 0-7.5 0"/></svg>';

const vcontainer = await IRF.vdom.container;
const vmap = await IRF.vdom.map;
const vodometer = await IRF.vdom.odometer;

const ml_map = vmap.data.map;

// Code for measuring distance is heavily rewritten adapted into OOP from
// https://maplibre.org/maplibre-gl-js/docs/examples/measure/

// This object handles the abstract measuring functions
class Measure {
    // GeoJSON object to hold our measurement features - points and a line
    geojson_points = {
        'type': 'FeatureCollection' as const,
        'features': []
    };
    geojson_line = {
        'type': 'FeatureCollection' as const,
        'features': []
    };

    // Feature to draw the line between points
    linestring = {
        type: "Feature" as const,
        geometry: {
            type: "LineString",
            coordinates: []
        },
        properties: {}
    };

    car = undefined;
    toggleCar() {
        if (this.car) {
            this.removePoint(this.car);
            this.car = undefined;
        } else {
            this.addPoint(
                vcontainer.data.currentCoords.lat,
                vcontainer.data.currentCoords.lng
            );
            this.car = this.geojson_points.features[this.geojson_points.features.length-1].properties.id;
        }
    }
    updateCar() {
        if (!this.car) return;
        const coords = [
            vcontainer.data.currentCoords.lng,
            vcontainer.data.currentCoords.lat
        ]
        this.geojson_points.features.forEach((point) => {
            if (point.properties.id == this.car) point.geometry.coordinates = coords;
            else if (distance(point.geometry.coordinates, coords) < 0.05) {
                this.removePoint(point.properties.id);
            }
        });
        this._updatePoints();
    }

    // Compute and display the distance determined by the line
    setDistance() {
        const unit = vodometer.data.isKilometers ? "km" : "mi";
        const conversion = vodometer.data.isKilometers ? 1 : vodometer.data.conversionFactor;
        let distance = length(this.linestring);
        // Assuming 10km/h
        const time_est = distance / 10;
        distance = distance / conversion;
        distance_control.dist_cont.innerText = `${distance.toFixed(3)} ${unit}`;
        distance_control.dist_cont.title = `~ ${Math.floor(time_est)}h ${Math.round((time_est % 1) * 60)}min (10km/h)`;
    }

    // Update the line based on the points
    _recomputeLine() {
        this.linestring.geometry.coordinates = this.geojson_points.features.map(
            (point) => {
                return point.geometry.coordinates;
            }
        );
        this.geojson_line.features = [this.linestring];
        (ml_map.getSource('geojson_line') as GeoJSONSource).setData(this.geojson_line);
    }

    // Update the points data on the map (and the distance based on that)
    _updatePoints() {
        this._recomputeLine();
        (ml_map.getSource('geojson_points') as GeoJSONSource).setData(this.geojson_points);
        this.setDistance();
    }

    // Remove all points
    clearPoints() {
        this.geojson_points.features = [];
        this._updatePoints();
        this.car = undefined;
    }

    // Add a point at lat, lng
    addPoint(lat, lng) {
        const point = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [lng, lat]
            },
            'properties': {
                'id': String(new Date().getTime())
            }
        };
        this.geojson_points.features.push(point);
        this._updatePoints();
    }

    // Remove a point with a given feature id
    removePoint(id) {
        this.geojson_points.features = this.geojson_points.features.filter((point) => {
            return point.properties.id !== id;
        });
        this._updatePoints();
    }

    async flyTo() {
        ml_map.fitBounds(
            (await (ml_map.getSource('geojson_points') as GeoJSONSource).getBounds()),
            {
                padding: 50
            }
        )
    }
}
export const measure = new Measure();


class DistanceControl implements IControl {
    _c_cont: HTMLDivElement; // Control container
    _map: Map;
    check: HTMLInputElement;
    dist_cont: HTMLDivElement;
    trash_button: HTMLButtonElement;

    constructor() {
        this._c_cont = document.createElement('div'); // Control container
        this._c_cont.style.display = "none";
        this._c_cont.className = 'maplibregl-ctrl maplibregl-ctrl-group mmt-distance-control';

        const check_cont = document.createElement("div");
        this._c_cont.appendChild(check_cont);
        const check = document.createElement("input");
        check.title = "Enable line editing";
        check.type = "checkbox";
        check_cont.appendChild(check);
        this.check = check;

        const dist_cont = document.createElement("div");
        dist_cont.style.cursor = "pointer";
        dist_cont.onclick = () => {measure.flyTo()}
        dist_cont.innerText = "0 km";
        this._c_cont.appendChild(dist_cont);
        this.dist_cont = dist_cont;

        const trash_button = document.createElement("button");
        trash_button.title = "Discard and finish measuring";
        trash_button.onclick = () => {this.endMeasure()}
        this._c_cont.appendChild(trash_button);
        this.trash_button = trash_button;

        const button_icon = document.createElement("span");
        button_icon.className = "maplibregl-ctrl-icon";
        button_icon.style.backgroundImage = `url(data:image/svg+xml,${encodeURIComponent(trash_svg)})`;
        button_icon.style.backgroundSize = "contain";
        trash_button.appendChild(button_icon);
    }

    onAdd(map: Map) {
        this._map = map;
        return this._c_cont;
    }

    onRemove() {
        this._c_cont.parentNode.removeChild(this._c_cont);
        this._map = undefined;
    }

    startMeasure() {
        measure.clearPoints();
        this.check.checked = true;
        this._c_cont.style.display = "flex";
    }

    endMeasure() {
        measure.clearPoints();
        this.check.checked = false;
        this._c_cont.style.display = "none";
    }
}

const distance_control = new DistanceControl();
ml_map.addControl(distance_control, "top-left");

ml_map.once("load", () => {
    // Add the two data sources
    ml_map.addSource('geojson_line', {
        'type': 'geojson',
        'data': measure.geojson_line
    });
    ml_map.addSource('geojson_points', {
        'type': 'geojson',
        'data': measure.geojson_points
    });

    // Add layers and styles to the map
    ml_map.addLayer({
        id: 'measure-lines',
        type: 'line',
        source: 'geojson_line',
        layout: {
            'line-cap': 'round',
            'line-join': 'round'
        },
        paint: {
            'line-color': '#0009',
            'line-width': 2.5
        },
    });
    ml_map.addLayer({
        id: 'measure-points',
        type: 'circle',
        source: 'geojson_points',
        paint: {
            'circle-radius': 5,
            'circle-color': '#000b'
        },
    });
    ml_map.moveLayer("measure-lines");
    ml_map.moveLayer("measure-points");

    // Handle clicking
    ml_map.on('click', (e) => {
        // Only interact with the measurements if the checkbox is ticked
        if (!distance_control.check.checked) return;

        // Did the user click any features?
        const features = ml_map.queryRenderedFeatures(e.point, {
            layers: ['measure-points']
        });
        if (features.length) {
            // Remove the clicked point
            measure.removePoint(features[0].properties.id);
        } else {
            // Add a new point
            measure.addPoint(e.lngLat.lat, e.lngLat.lng);
        }
    });

    vmap.data.marker.getElement().addEventListener("click", (e) => {
        if (!distance_control.check.checked) return;
        measure.toggleCar();
        e.stopPropagation();
    })

    // Update the cursor as it moves over our new features
    ml_map.on('mousemove', (e) => {
        if (!distance_control.check.checked) {
            // If we're not editing the measurements, stick to the default grab
            ml_map.getCanvas().style.cursor = "grab";
        } else {
            const features = ml_map.queryRenderedFeatures(e.point, {
                layers: ['measure-points']
            });
            // Pointer if hovering over a point, crosshair otherwise
            ml_map.getCanvas().style.cursor = features.length ?
                'pointer' :
                'crosshair';
        }
    });
})

// Add context menu option
const ruler_icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -1160 1360 1360"><path d="M200-160v-340q0-142 99-241t241-99q142 0 241 99t99 241q0 142-99 241t-241 99H200Zm80-80h260q108 0 184-76t76-184q0-108-76-184t-184-76q-108 0-184 76t-76 184v260Zm260-120q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41Zm0-80q-25 0-42.5-17.5T480-500q0-25 17.5-42.5T540-560q25 0 42.5 17.5T600-500q0 25-17.5 42.5T540-440ZM80-160v-200h80v200H80Zm460-340Z"/></svg>'
control.addButton(
    `data:image/svg+xml,${encodeURIComponent(ruler_icon)}`,
    "Measure distance",
    async (c) => {
        distance_control.startMeasure();
        if (c.context === "Car") measure.toggleCar();
        else if (c.context !== "Side") measure.addPoint(c.lat, c.lng);
    },
    undefined, {side_visible_default: false, before: "Open Street View"}
)