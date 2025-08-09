import * as IRF from 'internet-roadtrip-framework'
import { settings, panel } from './settings/settings'
import { checkUpdateMap, flyTo } from './flying'

const vcontainer = await IRF.vdom.container;
const vmap = await IRF.vdom.map;
const ml_map = vmap.data.map;
const car_marker = vmap.data.marker;
const marker_el = vmap.data.marker.getElement();

// Correct car marker offset (it's a little off-centre by default)
function default_marker_svg() {
    return (
        'url("data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20101%20245%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xml%3Aspace%3D%22preserve%22%20style%3D%22fill-rule%3Aevenodd%3Bclip-rule%3Aevenodd%3Bstroke-linecap%3Around%3Bstroke-linejoin%3Around%3Bstroke-miterlimit%3A1.5%22%3E%3Cg%20transform%3D%22translate(-118.117%20-1517)%22%3E%3Cpath%20d%3D%22M219%201598h-88.922l22.231-94h44.461z%22%20style%3D%22fill%3Aurl(%23a)%22%20transform%3D%22matrix(-1.13495%200%200%20-1.05851%20366.671%203208.5)%22%2F%3E'
        + (settings.car_marker_custom ? '' : '%3Ccircle%20cx%3D%22168.578%22%20cy%3D%221636.5%22%20r%3D%2238.5%22%20style%3D%22fill%3A%2300a6ff%3Bstroke%3A%23fff%3Bstroke-width%3A8.33px%22%2F%3E')
        + '%3C%2Fg%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22a%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%220%22%20gradientUnits%3D%22userSpaceOnUse%22%20gradientTransform%3D%22matrix(0%2094%20-114%200%20174.539%201504)%22%3E%3Cstop%20offset%3D%220%22%20style%3D%22stop-color%3A%2300a6ff%3Bstop-opacity%3A.77%22%2F%3E%3Cstop%20offset%3D%221%22%20style%3D%22stop-color%3A%2300a6ff%3Bstop-opacity%3A0%22%2F%3E%3C%2FlinearGradient%3E%3C%2Fdefs%3E%3C%2Fsvg%3E")'
    )
}
marker_el.style.backgroundImage = default_marker_svg();
marker_el.style.width = `${settings.car_marker_size}px`;
marker_el.style.height = `${settings.car_marker_size}px`;
marker_el.style.setProperty('--marker-opacity', settings.marker_opacity.toString());

// Custom car marker
const custom_car = document.createElement("img");
custom_car.src = settings.car_marker_url;
custom_car.style.maxWidth = `${settings.car_marker_scale}%`;
custom_car.style.maxHeight = `${settings.car_marker_scale}%`;
custom_car.style.rotate = `${settings.car_marker_rotation}deg`;
custom_car.style.display = settings.car_marker_custom ? "block" : "none";
marker_el.appendChild(custom_car);

// Set the marker rotation when the car moves
const changeStop = vcontainer.methods.changeStop;
vcontainer.state.changeStop = new Proxy(changeStop, {
    apply: (target, thisArg, args) => {
        const returnValue = Reflect.apply(target, thisArg, args);
        car_marker.setRotation(args[3]);
        if (
            checkUpdateMap()
            && settings.align_orientation
            && (Math.abs(ml_map.getBearing() - args[3]) % 360) > 1
        ) flyTo(undefined, args[3]);
        let x_flip = settings.car_marker_flip ? "-1" : "1";
        if (settings.car_marker_flip_x && args[3] > 180) {
            custom_car.style.transform = `scale(${x_flip}, -1)`;
        } else {
            custom_car.style.transform = `scale(${x_flip}, 1)`;
        }
        return returnValue;
    },
});
// Override the normal marker rotation setting method, we do it above!
vmap.state.setMarkerRotation = new Proxy(vmap.methods.setMarkerRotation, {
    apply: (target, thisArg, args) => {}
});

// Settings
const section = panel.add_section("Car marker", `You can set the car marker on the map to be
    any custom image, or change the appearance of the default marker too.`)

section.add_slider("Car marker opacity", "marker_opacity", (value) => {
    marker_el.style.setProperty('--marker-opacity', value);
}, [0, 1, 0.05]);

section.add_slider("Car marker size (px)", "car_marker_size", (value) => {
    marker_el.style.width = `${value}px`;
    marker_el.style.height = `${value}px`;
}, [20, 100, 1]);

section.add_checkbox("Custom car marker", "car_marker_custom", (show) => {
    custom_car.style.display = show ? "block" : "none";
    marker_el.style.backgroundImage = default_marker_svg();
});

section.add_input(
    "Car marker image URL", "car_marker_url", "",
    () => custom_car.src = settings.car_marker_url,
    "https://files.catbox.moe/a55qk5.png"
);

section.add_comment(`Default white van picture:
    <a href='https://www.vecteezy.com/free-png/2d-delivery-truck-top-view' target='_blank'>
    2d Delivery Truck Top View PNGs by Vecteezy</a>.
    You can upload your custom image to <a href='https://catbox.moe' target='_blank'>catbox.moe</a>
    to get an image URL.`)

section.add_slider("Custom car marker scale (%)", "car_marker_scale", (value) => {
    custom_car.style.maxWidth = `${value}%`;
    custom_car.style.maxHeight = `${value}%`;
}, [0, 100, 1]);
section.add_slider("Custom car marker rotation (deg)", "car_marker_rotation", (value) => {
    custom_car.style.rotate = `${value}deg`;
}, [0, 360, 5]);

section.add_checkbox("Flip custom image", "car_marker_flip");
section.add_checkbox("Flip image when going left", "car_marker_flip_x");