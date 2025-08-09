import {settings, panel} from './settings/settings'
import * as IRF from 'internet-roadtrip-framework'
import {type IControl, type Map} from 'maplibre-gl'

// Settings page for the side menu
const section = panel.add_section("Side menu", `You can access all the map actions by right-clicking the map,
    the car, or added markers, but here you can also pin your favourite buttons to the map's side menu.`);

// Default contexts for the context menu
const contexts = ["Side", "Map", "Car", "Marker"];

// A Maplibre Control class that implements our context and side menus
const mapContainerEl = await IRF.dom.map;
export class TricksControl implements IControl {
    _c_cont: HTMLDivElement; // Control container
    _m_cont: HTMLDivElement; // Menu container
    _m_options: HTMLDivElement; // Menu options container
    _m_label: HTMLSpanElement; // Menu label
    _s_cont: HTMLDivElement; // Settings container
    _map: Map;

    constructor() {
        this._c_cont = document.createElement('div'); // Control container
        this._c_cont.className = 'maplibregl-ctrl maplibregl-ctrl-group mmt-side-control';

        this._m_cont = document.createElement('div'); // Menu container
        this._m_cont.id = "mmt-menu";
        this._m_cont.style.display = "none";
        mapContainerEl.querySelector('#mini-map').appendChild(this._m_cont);
        document.addEventListener("click", (e) => {
            this._hide_menu();
        });

        this._m_options = document.createElement('div'); // Menu options container
        this._m_options.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this._m_cont.appendChild(this._m_options);

        let label_box = document.createElement('div');
        label_box.id = "mmt-menu-label";
        label_box.className = 'maplibregl-ctrl maplibregl-ctrl-group';
        this._m_cont.appendChild(label_box);

        this._m_label = document.createElement('span'); // Menu label
        this._m_label.innerText = "Map";

        let label =  document.createElement('span');
        label.innerText = " menu";
        label.prepend(this._m_label);
        label_box.appendChild(label);

        let close =  document.createElement('span');
        close.innerText = "X";
        close.id = "mmt-menu-close";
        label_box.appendChild(close);

        this._s_cont = document.createElement('div') // Settings container
    }

    _show_menu(): void {
        control._m_cont.style.display = "block";
        mapContainerEl.classList.add("mmt-map-menu-opened");
    }
    _hide_menu(): void {
        this._m_cont.style.display = "none";
        mapContainerEl.classList.remove("mmt-map-menu-opened");
    }
    openMenu(context: string, lat: number, lng: number, left: number, top: number, data: any=undefined) {
        this.context = context;
        this.lat = lat;
        this.lng = lng;
        this.data = data;

        this._m_cont.style.top = `${top}px`;
        this._m_cont.style.left = `${left}px`;
        this._show_menu();
    }

    _context = undefined;
    set context(value: any) {
        this._m_label.innerText = value;
        this._m_cont.className = `mmt-menu-${value.replaceAll(' ', '-')}`
        this._context = value;
    }
    get context() {
        return this._context;
    }
    lat = 0;
    lng = 0;
    data = undefined;

    onAdd(map: Map): HTMLDivElement {
        this._map = map;
        return this._c_cont;
    }

    onRemove(): void {
        this._c_cont.parentNode.removeChild(this._c_cont);
        this._map = undefined;
    }

    addButton(
        icon: any, name: string, callback: (arg0: this) => void,context=undefined,
        { side_visible_default = true, before = undefined } = {}
    ) {
        // Add side button
        const returnValue = {
            icon,
            name,
            callback,
            contexts,
            side_button: undefined,
            side_icon: undefined,
            side_checkbox: undefined,
            context_button: undefined,
            context_icon: undefined,
            context_label: undefined,
        }
        if (context == undefined || context.includes("Side")) {
            let button = document.createElement("button");
            settings[`side_${name}`] = GM_getValue(`side_${name}`, side_visible_default)
            button.style.display = settings[`side_${name}`] ? "block" : "none";
            button.title = name;
            const checkbox = section.add_checkbox(`Show ${name}`, `side_${name}`, (value: any) => {
                button.style.display = value ? "block" : "none";
            });

            let button_icon = document.createElement("span");
            button_icon.className = "maplibregl-ctrl-icon";
            button_icon.style.backgroundImage = `url("${icon}")`;
            button_icon.style.backgroundSize = "contain";
            button.appendChild(button_icon);
            button.onclick = async () => {
                this.context = "Side";
                const vcontainer = await IRF.vdom.container;
                this.lat = vcontainer.data.currentCoords.lat;
                this.lng = vcontainer.data.currentCoords.lng;
                this.data = undefined;
                callback(this)
            };
            if (before) {
                const sibling = Array.from(this._c_cont.children).filter((el: HTMLElement) => {return el.title === before})[0]
                sibling.insertAdjacentElement("beforebegin", button)
            } else this._c_cont.appendChild(button);
            returnValue.side_button = button;
            returnValue.side_icon = button_icon;
            returnValue.side_checkbox = checkbox;
        }
        
        let button = document.createElement("button");
        if (context !== undefined) {
            contexts.forEach((v, i) => {
                if (!context.includes(v)) button.classList.add(`mmt-hide-${v.replaceAll(' ', '-')}`);
            })
        }

        let button_icon = document.createElement("span");
        button_icon.className = "maplibregl-ctrl-icon";
        button_icon.style.backgroundImage = `url("${icon}")`;
        button_icon.style.backgroundSize = "contain";
        button.appendChild(button_icon);

        let button_label = document.createElement("span");
        button_label.innerText = name;
        button.appendChild(button_label);

        button.onclick = () => {
            callback(this)
        };
        if (before) {
            const sibling = Array.from(this._m_options.children).filter((el: HTMLElement) => {return el.innerText === before})[0]
                sibling.insertAdjacentElement("beforebegin", button)
            } else this._m_options.appendChild(button);;
        returnValue.context_button = button;
        returnValue.context_icon = button_icon;
        returnValue.context_label = button_label;

        return returnValue;
    }
}

// Define map controls to add buttons for
export const control = new TricksControl();

// Export some APIs
(unsafeWindow as any)._MMT_control = control;
(unsafeWindow as any)._MMT_addContext = (name: string, available: string[]) => {
    contexts.push(name);
    const css_name = name.replaceAll(' ', '-');
    Array.from(control._m_options.children).forEach((child) => {
        const child_children = child.children as HTMLCollectionOf<HTMLElement>;
        if (!available.includes(child_children[1].innerText)) {
            child.classList.add(`mmt-hide-${css_name}`);
        }
    })
    GM.addStyle(`
    #mini-map {
        .mmt-menu-${css_name} .mmt-hide-${css_name} {display: none !important;}
    }`);
}

// Add the Control to the map and set up triggers for contex menus
const vmap = await IRF.vdom.map;
const ml_map = vmap.data.map;

ml_map.addControl(control, "bottom-left");
ml_map.on("contextmenu", (e) => {
    control.openMenu(
        "Map", e.lngLat.lat, e.lngLat.lng,
        e.originalEvent.clientX, e.originalEvent.clientY
    )
});

const vcontainer = await IRF.vdom.container;
vmap.data.marker.getElement().oncontextmenu = (e) => {
    e.stopPropagation();
    e.preventDefault();

    control.openMenu(
        "Car",
        vcontainer.data.currentCoords.lat,
        vcontainer.data.currentCoords.lng,
        e.clientX, e.clientY
    )
}

// Add a compass Control
const maplibre = await IRF.modules.maplibre;
const compass = new maplibre.NavigationControl({
    visualizePitch: true,
    visualizeRoll: true,
    showCompass: true,
    showZoom: false
});
ml_map.addControl(compass, "bottom-left");
compass._container.style.display = settings.side_compass ? "block" : "none";
section.add_checkbox("Show compass", "side_compass", (show) => {
    compass._container.style.display = show ? "block" : "none";
});