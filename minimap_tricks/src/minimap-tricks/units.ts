import * as IRF from 'internet-roadtrip-framework'
import { vcontainer, vmap, vodometer } from './awaits';
import { measure } from './distance';
import { settings, panel } from './settings/settings'

const section = panel.add_section("Measurements and units", `Do you prefer metric? (correct) Or would you like more precision?`);

const ml_map = await vmap.data.map;
const maplibre = await IRF.modules.maplibre;
const odometer_el = await IRF.dom.odometer;

// Add a scale bar
const scale_control = new maplibre.ScaleControl({
    unit: vodometer.data.isKilometers ? "metric": "imperial"
})
ml_map.addControl(scale_control, "bottom-right");
scale_control._container.style.margin = "0px 36px 5px 0px";
scale_control._container.style.display = settings.show_scale ? "block" : "none";

// Sync the scale bar units to the odometer
// Get the original setter
const { set: isKilometersSetter } = Object.getOwnPropertyDescriptor(vodometer.state, 'isKilometers');
// Override the setter
Object.defineProperty(vodometer.state, 'isKilometers', {
    set(isKilometers) {
        const r_value = isKilometersSetter.call(this, isKilometers);
        // Set the units on the scale bar
        scale_control.setUnit(isKilometers ? "metric": "imperial");
        // Update the units on the distance measurement
        measure.setDistance();
        return r_value
    },
    configurable: true,
    enumerable: true,
});

// Add a settings checkbox for showing the scale bar
section.add_checkbox("Show map scale", "show_scale", (show) => {
    scale_control._container.style.display = show ? "block" : "none";
});

// Default to kilometres if desired
if (settings.km_units) {
    vodometer.state.isKilometers = true;
}
section.add_checkbox("Default to metric units", "km_units", async (value) => {
    vodometer.state.isKilometers = value;
});

// Display decimal points if desired
const decimal_el = document.createElement("span");
const units_el = odometer_el.getElementsByClassName("miles-text")[0];
decimal_el.style.display = "none";
units_el.appendChild(decimal_el);
vcontainer.state.updateData = new Proxy(
    vcontainer.methods.updateData, {
    apply: (target, thisArg, args) => {
        // debugger;
        let distance = args[0]["distance"]
        if (vodometer.data.isKilometers) {distance *= vodometer.data.conversionFactor}
        const decimals = ((distance % 1 + 1) * 100).toString().substring(1, 3);
        decimal_el.innerHTML = `<br>.${decimals}`;
        return Reflect.apply(target, thisArg, args);
    },
});
section.add_checkbox("Show decimals in distance", "decimal_units", async (value) => {
    if (value) {
        odometer_el.classList.toggle("mmt-miles-decimal", true);
    } else {
        odometer_el.classList.toggle("mmt-miles-decimal", false);
    }
});
odometer_el.classList.toggle("mmt-miles-decimal", settings.decimal_units);

// This setting gets used by "copy coordinates"
section.add_checkbox("Use minutes and seconds when copying coordinates", "coordinates_fancy");