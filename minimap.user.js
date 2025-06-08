// ==UserScript==
// @name        Internet Roadtrip Minimap tricks
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/internet-roadtrip/*
// @version     0.2.5
// @author      jdranczewski (+netux +GameRoMan)
// @description Provide some bonus options for the Internet Roadtrip minimap.
// @license     MIT
// @icon         https://files.catbox.moe/v4yu3f.png
// @grant        GM.setValues
// @grant        GM.getValues
// @grant        GM.addStyle
// @grant        unsafeWindow
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// @require      https://cdn.jsdelivr.net/gh/ianengelbrecht/geo-coordinates-parser@b06d051f2a70bc95c2fa1a063ceef85f19823fee/bundle/geocoordsparser.js
// @require      https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js
// ==/UserScript==

// This works together with irf.d.ts to give us type hints
/**
 * Internet Roadtrip Framework
 * @typedef {typeof import('internet-roadtrip-framework')} IRF
 */

(async function() {
    // Get map methods and various objects
    const map = await IRF.vdom.map;
    const odometer = await IRF.vdom.odometer;
    const ml_map = map.data.map;
    const mapMethods = map.methods;
    const mapContainerEl = await IRF.dom.map;
    const miniMapEl = mapContainerEl.querySelector('#mini-map');
    const expandButtonEl = mapContainerEl.querySelector('.expand-button');
    const marker_el = map.data.marker.getElement();
    const vcontainer = await IRF.vdom.container;
    const maplibre = await IRF.modules.maplibre;
    let measure;

    // Custom styles
    GM.addStyle(`
    @media (min-width: 900px) {
        .map-container {
            & .expand-button {
                cursor: nesw-resize;
                display: flex !important;
            }

            & #mini-map {
                position: relative;
                width: var(--map-width, 250px) !important;
                height: var(--map-height, 170px) !important;
            }
        }
        .expanded #mini-map {
            width: var(--map-width-expanded, 450px) !important;
            height: var(--map-height-expanded, 300px) !important;
        }
        .expanded .expand-button img {
            rotate: 180deg;
        }
        .expanded {
            opacity: var(--map-opacity-expanded, 1) !important;
        }
    }
    .map-container {
        transition: opacity .5s;
        &:hover {
            opacity: 1 !important;
        }
    }
    .maplibregl-marker {
        opacity: var(--marker-opacity, 1) !important;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .mmt-map-menu-opened {
        opacity: 1 !important;
    }

    /* Putting this in #mini-map so Netux's PIP script
       can copy the styles correctly */
    #mini-map {
        #mmt-menu {
            position: fixed;
            z-index: 1000;
            transform: translate(0, -100%);
            & button {
                width: 100%;
                text-align: left;
                display: flex;
                align-items: center;
            }
            & .maplibregl-ctrl-icon {
                width: 29px;
            }
            & .maplibregl-ctrl-icon + span {
                margin: 0 9px 0 5px;
            }
            & #mmt-menu-label {
                margin: 5px 0 0 0;
                font-size: 14px;
                padding: 6px;
                background: #f1f1f1;
                & #mmt-menu-close {
                    float: right;
                    margin-right: 2px;
                    cursor: pointer;
                }
            }
        }
        .mmt-menu-Map .mmt-hide-Map {display: none !important;}
        .mmt-menu-Marker .mmt-hide-Marker {display: none !important;}
        .mmt-menu-Car .mmt-hide-Car {display: none !important;}

        /* For debugging */
        .mmt-menu-Map .mmt-hide-Map {opacity: 0.5 !important;}
        .mmt-menu-Marker .mmt-hide-Marker {opacity: 0.5 !important;}
        .mmt-menu-Car .mmt-hide-Car {opacity: 0.5 !important;}

        .mmt-distance-control {
            display: flex;
            & div {
                display: flex;
                align-items: center;
                padding: 0px 5px;
                border-right: 1px solid #ddd;
            }
        }
    }

    /* Decimal points */
    .mmt-miles-decimal {
        text-align: center;
        line-height: 10px;
        & span {
            display: inline !important;
            font-size: 10px;
        }
    }

    /* For Netux's PIP script */
    @media (display-mode: picture-in-picture) {
        .maplibregl-ctrl-scale {
            margin: 0px 5px 5px 0px !important;
        }
        #mini-map {
            #mmt-menu {
                transform: translate(0, 0px) !important;
                top: 10px !important;
                right: 10px !important;
                left: auto !important;
            }
        }
    }
    `);

    // Settings
    const settings = {
        "expand_map": false,
        "default_zoom": 12.5,
        "reset_zoom": false,
        "show_scale": true,
        "km_units": false,
        "decimal_units": false,
        "map_size": {
            width: undefined,
            height: undefined,
            expanded_width: undefined,
            expanded_height: undefined
        },
        "map_opacity": 1,
        "map_opacity_expanded": 1,
        "marker_opacity": 1,
        "route_opacity": 1,
        "marker_color": "#f7a000",
        "markers": {},

        "car_marker_custom": false,
        "car_marker_size": 54,
        "car_marker_url": "https://files.catbox.moe/a55qk5.png",
        "car_marker_scale": 65,
        "car_marker_rotation": 90,
        "car_marker_flip": false,
        "car_marker_flip_x": false,

        "side_compass": false,
        "side_Go to coordinates": false,
        "side_Copy coordinates": false,
        "side_Measure distance": false,
        "side_Open Street View": true,
        "side_Open SV coverage map": true,
        "side_Add marker": false,
        "side_Centre": true,

    }
    const storedSettings = await GM.getValues(Object.keys(settings))
    Object.assign(
        settings,
        storedSettings
    );
    await GM.setValues(settings);

    // Settings panel GUI
    let gm_info = GM.info
    gm_info.script.name = "Minimap tricks"
    const irf_settings = IRF.ui.panel.createTabFor(
        gm_info, {
            tabName: "Minimap",
            style: "a {color: #aaa};"
        }
    );

    // Add UI button to reset map scale
    {
        let button = document.createElement("button");
        button.style.marginRight = "10px";
        button.innerText = "Reset map size";
        button.onclick = () => {
            settings.map_size = {};
            GM.setValues(settings);
            setMiniMapSize(settings.map_size);
        }
        irf_settings.container.appendChild(button);
    }

    // Add UI button to remove all markers
    {
        let button = document.createElement("button");
        button.innerText = "Remove all markers";
        button.className = "mmt-button";
        button.onclick = () => {
            for (const [marker_id, marker] of Object.entries(markers)) {
                marker._mmt_remove();
            }
        }
        irf_settings.container.appendChild(button);
    }
    irf_settings.container.appendChild(document.createElement("br"));
    irf_settings.container.appendChild(document.createElement("br"));

    // Checkboxes
    function add_checkbox(name, identifier, callback=undefined, settings_container=irf_settings.container) {
        let label = document.createElement("label");

        let checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = settings[identifier];
        checkbox.className = IRF.ui.panel.styles.toggle;
        label.appendChild(checkbox);

        let text = document.createElement("span");
        text.innerText = " " + name;
        label.appendChild(text);

        checkbox.onchange = () => {
            settings[identifier] = checkbox.checked;
            GM.setValues(settings);
            if (callback) callback(checkbox.checked);
        }

        settings_container.appendChild(label);
        settings_container.appendChild(document.createElement("br"));
        settings_container.appendChild(document.createElement("br"));
    }
    add_checkbox("Auto-expand map", "expand_map");
    add_checkbox("Reset zoom with map re-centre", "reset_zoom");

    function add_slider(
        name, identifier, callback=undefined,
        slider_bits=[1, 17, .5]
    ) {
        let label = document.createElement("label");

        let text = document.createElement("span");
        text.innerText = " " + name + ": ";
        label.appendChild(text);

        let value_label = document.createElement("span");
        value_label.innerText = settings[identifier];
        label.appendChild(value_label);

        let slider = document.createElement("input");
        slider.type = "range";
        slider.min = slider_bits[0];
        slider.max = slider_bits[1];
        slider.step = slider_bits[2];
        slider.value = settings[identifier];
        slider.className = IRF.ui.panel.styles.slider;
        label.appendChild(slider);

        slider.oninput = () => {
            settings[identifier] = slider.value;
            value_label.innerText = slider.value;
            GM.setValues(settings);
            if (callback) callback(slider.value);
        }
        slider.onmousedown = (e) => {e.stopPropagation()}

        irf_settings.container.appendChild(label);
        irf_settings.container.appendChild(document.createElement("br"));
        irf_settings.container.appendChild(document.createElement("br"));
    }
    add_slider("Default map zoom", "default_zoom");

    // Fly to a location
    let first_fly = true;
    const zoom_subscription = ml_map.on("moveend", () => {
        if (Math.abs(ml_map.getZoom() - settings.default_zoom) < 0.2) {
            first_fly = false;
            zoom_subscription.unsubscribe();
        }
    })
    function flyTo(map, coords) {
        let args = {
            center: [
                coords[1],
                coords[0]
            ],
            essential: !0
        }
        if (first_fly || settings.reset_zoom) {
            args["zoom"] = settings.default_zoom;
        }
        map.flyTo(args)
    }
	// Proxy the map resetting
	(await IRF.vdom.map).state.flyTo = new Proxy(mapMethods.flyTo, {
		apply: (target, thisArg, args) => {
			Date.now() - thisArg.lastUserInteraction > 30000 &&
            flyTo(thisArg.map, args)
		},
	});

    // Add buttons to the map - define the Control object that holds them
    const contexts = ["Side", "Map", "Car", "Marker"];
    class TricksControl {
        constructor() {
            this._c_cont = document.createElement('div'); // Control container

            this._m_cont = document.createElement('div'); // Menu container
            this._m_cont.id = "mmt-menu";
            this._m_cont.style.display = "none";
            miniMapEl.appendChild(this._m_cont);
            document.addEventListener("click", (e) => {
                this._hide_menu();
            });

            this._m_options = document.createElement('div');
            this._m_options.className = 'maplibregl-ctrl maplibregl-ctrl-group';
            this._m_cont.appendChild(this._m_options);

            let label_box = document.createElement('div');
            label_box.id = "mmt-menu-label";
            label_box.className = 'maplibregl-ctrl maplibregl-ctrl-group';
            this._m_cont.appendChild(label_box);

            this._m_label = document.createElement('span');
            this._m_label.innerText = "Map";
            label_box.appendChild(this._m_label)

            let label =  document.createElement('span');
            label.innerText = " menu";
            label_box.appendChild(label);

            let close =  document.createElement('span');
            close.innerText = "X";
            close.id = "mmt-menu-close";
            label_box.appendChild(close);

            this._s_cont = document.createElement('div') // Settings container
        }

        _show_menu() {
            control._m_cont.style.display = "block";
            mapContainerEl.classList.add("mmt-map-menu-opened");
        }
        _hide_menu() {
            this._m_cont.style.display = "none";
            mapContainerEl.classList.remove("mmt-map-menu-opened");
        }

        _context = undefined;
        set context(value) {
            this._m_label.innerText = value;
            this._m_cont.className = `mmt-menu-${value}`
            this._context = value;
        }
        get context() {
            return this._context;
        }
        lat = 0;
        lng = 0;
        marker = undefined;

        onAdd(map) {
            this._map = map;
            this._c_cont.className = 'maplibregl-ctrl maplibregl-ctrl-group';
            return this._c_cont;
        }

        onRemove() {
            this._c_cont.parentNode.removeChild(this._c_cont);
            this._map = undefined;
        }

        addButton(icon, name, callback, context=undefined) {
            // Add side button
            if (context == undefined || context.includes("Side")) {
                let button = document.createElement("button");
                button.style.display = settings[`side_${name}`] ? "block" : "none";
                button.title = name;
                add_checkbox(`Show ${name}`, `side_${name}`, (value) => {
                    button.style.display = value ? "block" : "none";
                }, this._s_cont);

                let button_icon = document.createElement("span");
                button_icon.className = "maplibregl-ctrl-icon";
                button_icon.style.backgroundImage = `url("${icon}")`;
                button_icon.style.backgroundSize = "contain";
                button.appendChild(button_icon);
                button.onclick = () => {
                    this.context = "Side";
                    this.lat = vcontainer.data.currentCoords.lat;
                    this.lng = vcontainer.data.currentCoords.lng;
                    this.marker = undefined;
                    callback(this)
                };
                this._c_cont.appendChild(button);
            }
            
            let button = document.createElement("button");
            if (context !== undefined) {
                contexts.forEach((v, i) => {
                    if (!context.includes(v)) button.classList.add(`mmt-hide-${v}`);
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
            this._m_options.appendChild(button);
        }
    }
    // Define map controls to add buttons for
    let control = new TricksControl();

    // Add all the buttons!
    // Go to coordinates
    control.addButton(
        "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%22-6%20-6%2036%2036%22%20stroke-width%3D%221.5%22%20stroke%3D%22currentColor%22%20class%3D%22size-6%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M6%2012%203.269%203.125A59.8%2059.8%200%200%201%2021.485%2012%2059.8%2059.8%200%200%201%203.27%2020.875L5.999%2012Zm0%200h7.5%22%2F%3E%3C%2Fsvg%3E",
        "Go to coordinates",
        async (c) => {
            let converted;
            try {
                converted = convert(prompt("Input coordinates here:"));
            } catch {
                alert("Coordinates were incorrect!");
                return
            }
            add_marker(converted.decimalLatitude, converted.decimalLongitude);
            flyTo(
                ml_map,
                [converted.decimalLatitude, converted.decimalLongitude]
            )
        },
        ["Side", "Map"]
    );

    // Copy coordinates
    control.addButton(
        "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%22-6%20-6%2036%2036%22%20stroke-width%3D%221.5%22%20stroke%3D%22currentColor%22%20class%3D%22size-6%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M15.75%2017.25v3.375c0%20.621-.504%201.125-1.125%201.125h-9.75a1.125%201.125%200%200%201-1.125-1.125V7.875c0-.621.504-1.125%201.125-1.125H6.75a9%209%200%200%201%201.5.124m7.5%2010.376h3.375c.621%200%201.125-.504%201.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9%209%200%200%200-1.5-.124H9.375c-.621%200-1.125.504-1.125%201.125v3.5m7.5%2010.375H9.375a1.125%201.125%200%200%201-1.125-1.125v-9.25m12%206.625v-1.875a3.375%203.375%200%200%200-3.375-3.375h-1.5a1.125%201.125%200%200%201-1.125-1.125v-1.5a3.375%203.375%200%200%200-3.375-3.375H9.75%22%2F%3E%3C%2Fsvg%3E",
        "Copy coordinates",
        async (c) => {
            const converted = convert(`${c.lat},${c.lng}`);
            navigator.clipboard.writeText(converted.toCoordinateFormat("DMS").replaceAll(" ", "").replace(",", ", "));
        }
    );

    control.addButton(
        "",
        "Measure distance",
        async (c) => {
            distance_control.startMeasure();
            if (c.context != "Side") measure.addPoint(c.lat, c.lng);
        }
    )

    // Open Street View
    control.addButton(
        "https://storage.googleapis.com/support-kms-prod/SNP_E2308F5561BE1525D2C88838252137BC5634_4353424_en_v0",
        "Open Street View",
        async (c) => {
            let data = vcontainer.data;
            // URL pattern from https://roadtrip.pikarocks.dev/
            const url = (
                "https://www.google.com/maps/@?api=1&map_action=pano" +
                `&viewpoint=${c.lat},${c.lng}` +
                ((c.context == "Car" || c.context == "Side") ? `&pano=${data.currentPano}&heading=${data.currentHeading}` : "") +
                "&fov=90"
            )
            console.log(c.context, url);
		    window.open(url, "_blank");
        }
    );

    // Open SV coverage map
    control.addButton(
        "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xml%3Aspace%3D%22preserve%22%20width%3D%22122.9%22%20height%3D%22122.9%22%3E%3Cpath%20d%3D%22M24.7%2062.4c1.8%201.6%203.6%203.2%205.4%204.6%202.4-3.6%205-7%208-10a7.2%207.2%200%200%201-.7-5.2c-3-1.9-6-4-9.2-6.4a38%2038%200%200%200-3.7%2017.3zm5.2-20.3c3.2%202.4%206.3%204.6%209.2%206.5a7.2%207.2%200%200%201%209.7-.8%2058.2%2058.2%200%200%201%2014.8-7%208%208%200%200%201%20.6-4c-4.4-3.8-9.6-7-15.6-10A37%2037%200%200%200%2029.9%2042zm23.7-16.8a75%2075%200%200%201%2012.7%208.5%208%208%200%200%201%204.6-2L72%2026a37%2037%200%200%200-18.4-.7zm21.9%202-1%205c2.4%201%204.3%203%205%205.5%203.3-.3%206.7-.3%2010.2-.1a37.7%2037.7%200%200%200-14.2-10.5zm17%2014.2c-4.5-.4-8.8-.4-12.9%200a8%208%200%200%201-2.5%204.4%2049%2049%200%200%201%206%2013.3h.8c3.3%200%206%202%207%205l7.4.2.1-3c0-7.3-2.1-14.2-5.9-20zM97.8%2068l-6.8-.1c-.6%202.8-2.8%205-5.6%205.6.1%203.3%200%206.9-.4%2010.6%202-.2%204.2-.5%206.3-1%203.3-4.3%205.5-9.5%206.5-15.1zm-4.4%2018.4a40.5%2040.5%200%200%201-32%2015.6A40.5%2040.5%200%200%201%2021%2061.4%2040.5%2040.5%200%200%201%2061.4%2021%2040.5%2040.5%200%200%201%20102%2061.4a40%2040%200%200%201-8.6%2025zm-5.7%201-3.1.4-.5%202.8%203.5-3zm-7.8%206%201-5.4c-6.6.4-13%200-19.1-1.4a6.5%206.5%200%200%201-5.4%202.3L53%2097.5c2.7.6%205.5%201%208.3%201v-.1c6.8%200%2013-1.8%2018.5-5zm-30.3%203%203.4-8.7a6.5%206.5%200%200%201-2.7-4.5%2086%2086%200%200%201-19.2-10.9l-3%205.3a37.1%2037.1%200%200%200%2021.5%2018.9zM26.4%2073.3l1.8-3.1-3.2-2.6c.3%202%20.8%203.9%201.4%205.7zM51%2050.7a7.2%207.2%200%200%201%20.4%204.9c4%201.9%207.9%203.4%2011.8%204.6a261%20261%200%200%200%204.1-13.5c-1-.6-1.8-1.5-2.5-2.5A55.5%2055.5%200%200%200%2051%2050.7zm-1.5%208a7.2%207.2%200%200%201-9%201c-2.7%202.8-5.2%206-7.5%209.5a83.2%2083.2%200%200%200%2018%2010.3%206.5%206.5%200%200%201%206.5-3.6c1.6-4%203-8%204.5-12.3a85.6%2085.6%200%200%201-12.5-4.9zm24.4-11a8.1%208.1%200%200%201-3.1.2l-4%2013.3c3.4.8%207%201.5%2010.6%202%20.6-1.1%201.4-2%202.4-2.7a46.8%2046.8%200%200%200-5.9-12.8zm7.8%2025.6a7.2%207.2%200%200%201-5-6.6c-3.8-.5-7.5-1.2-11.1-2a419%20419%200%200%201-4.7%2012.6%206.5%206.5%200%200%201%202.4%206%2070.3%2070.3%200%200%200%2018%201c.4-3.8.6-7.5.4-11z%22%20style%3D%22fill%3A%235fbdff%3Bfill-opacity%3A1%3Bstroke-width%3A.660746%22%2F%3E%3C%2Fsvg%3E",
        "Open SV coverage map",
        async (c) => {
            const url = (
                "https://sv-map.netlify.app/#base=roadmap&cov=all&" +
                `panos=&zoom=${ml_map.getZoom()+1}&center=${c.lat}%2C${c.lng}`
            )
		    window.open(url, "_blank")
        }
    );

    // Set up markers
    const markers = {};
    unsafeWindow._MMT_getMarkers = () => {
        return markers;
    }
    const marker_icon_base = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%22-5%20-6%2037%2036%22%20stroke-width%3D%221.5%22%20stroke%3D%22currentColor%22%20class%3D%22size-6%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M15%2010.5a3%203%200%201%201-6%200%203%203%200%200%201%206%200%22%2F%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19.5%2010.5c0%207.142-7.5%2011.25-7.5%2011.25S4.5%2017.642%204.5%2010.5a7.5%207.5%200%201%201%2015%200%22%2F%3E";
    async function add_marker(lat, lng, marker_id=undefined) {
        const marker = new maplibre.Marker({
            draggable: true,
            opacity: 0.7,
            scale: 0.8,
            color: settings.marker_color
        })
          .setLngLat([lng, lat])
          .addTo(ml_map);

        if (!marker_id) {
            marker_id = crypto.randomUUID();
            settings.markers[marker_id] = [lat, lng];
            GM.setValues(settings);
        }
        marker._mmt_id = marker_id;
        markers[marker_id] = marker;

        marker._mmt_remove = () => {
            delete settings.markers[marker_id];
            delete markers[marker_id];
            GM.setValues(settings);
            marker.remove();
        }

        marker.on("dragend", (e) => {
            const lngLat = marker.getLngLat();
            settings.markers[marker_id] = [lngLat.lat, lngLat.lng];
            GM.setValues(settings);
        });

        marker.getElement().addEventListener("contextmenu", (f) => {
            f.stopPropagation();
            f.preventDefault();
            control.context = "Marker";
            control.lat = lat;
            control.lng = lng;
            control.marker = marker;

            control._m_cont.style.top = `${f.clientY}px`;
            control._m_cont.style.left = `${f.clientX}px`;
            control._show_menu();
        });
    }
    for (const [marker_id, value] of Object.entries(settings.markers)) {
        add_marker(value[0], value[1], marker_id);
    }

    // Add marker
    control.addButton(
        marker_icon_base + "%3Cpath%20d%3D%22M19%2021h8m-4-4v8%22%2F%3E%3C%2Fsvg%3E",
        "Add marker",
        async (c) => {
            add_marker(c.lat, c.lng);
        },
        ["Side", "Car", "Map"]
    );

    // Centre
    control.addButton(
        "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='29' height='29' fill='%23333' viewBox='0 0 20 20'%3E%3Cpath d='M10 4C9 4 9 5 9 5v.1A5 5 0 0 0 5.1 9H5s-1 0-1 1 1 1 1 1h.1A5 5 0 0 0 9 14.9v.1s0 1 1 1 1-1 1-1v-.1a5 5 0 0 0 3.9-3.9h.1s1 0 1-1-1-1-1-1h-.1A5 5 0 0 0 11 5.1V5s0-1-1-1m0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7'/%3E%3Ccircle cx='10' cy='10' r='2'/%3E%3C/svg%3E",
        "Centre",
        async (c) => {
            flyTo(
                ml_map,
                [c.lat, c.lng]
            )
        },
        ["Side", "Car", "Marker"]
    );

    // Remove marker
    control.addButton(
        marker_icon_base + "%3Cpath%20d%3D%22M20%2018l6%206m-6%200l6%20-6%22%2F%3E%3C%2Fsvg%3E",
        "Remove marker",
        async (c) => {
            control.marker._mmt_remove();
        },
        ["Marker"]
    );

    // Add the Control to the map and set up triggers for contex menus
    ml_map.addControl(control, "bottom-left");
    ml_map.on("contextmenu", (e) => {
        control.context = "Map";
        control.lat = e.lngLat.lat;
        control.lng = e.lngLat.lng;
        control.marker = undefined;

        control._m_cont.style.top = `${e.originalEvent.clientY}px`;
        control._m_cont.style.left = `${e.originalEvent.clientX}px`;
        control._show_menu();
    })
    marker_el.oncontextmenu = (e) => {
        e.stopPropagation();
        e.preventDefault();
        control.context = "Car";
        control.lat = vcontainer.data.currentCoords.lat;
        control.lng = vcontainer.data.currentCoords.lng;
        control.marker = undefined;

        control._m_cont.style.top = `${e.clientY}px`;
        control._m_cont.style.left = `${e.clientX}px`;
        control._show_menu();
    }
    // Hide the menu when PIP exits
    if (window.documentPictureInPicture) {
        documentPictureInPicture.addEventListener("enter", (e) => {
            e.window.addEventListener("pagehide", (f) => {
                control._hide_menu();
            });
        })
    }

    // Add a scale bar
    const scale_control = new (await IRF.modules.maplibre).ScaleControl({
        unit: odometer.data.isKilometers ? "metric": "imperial"
    })
    ml_map.addControl(scale_control, "bottom-right");
    scale_control._container.style.margin = "0px 36px 5px 0px";
    scale_control._container.style.display = settings.show_scale ? "block" : "none";

    // Sync the scale bar units to the odometer
    // Get the original setter
    const { set: isKilometersSetter } = Object.getOwnPropertyDescriptor(odometer.state, 'isKilometers');
    // Override the setter
    Object.defineProperty(odometer.state, 'isKilometers', {
        set(isKilometers) {
            const r_value = isKilometersSetter.call(this, isKilometers);
            // Set the units on the scale bar
            scale_control.setUnit(isKilometers ? "metric": "imperial");
            // Update the units on the distance measurement
            if (measure) measure.setDistance();
            return r_value
        },
        configurable: true,
        enumerable: true,
    });

    add_checkbox("Show map scale", "show_scale", (show) => {
        scale_control._container.style.display = show ? "block" : "none";
    });

    // Default to kilometres if desired
    if (settings.km_units) {
        odometer.state.isKilometers = true;
    }
    add_checkbox("Use metric units", "km_units", async (value) => {
        odometer.state.isKilometers = value;
    });

    // Display decimal points if desired
    const decimal_el = document.createElement("span");
    const units_el = (await IRF.dom.odometer).getElementsByClassName("miles-text")[0];
    decimal_el.style.display = "none";
    units_el.appendChild(decimal_el);
    (await IRF.vdom.container).state.updateData = new Proxy(
        (await IRF.vdom.container).methods.updateData, {
        apply: (target, thisArg, args) => {
            // debugger;
            let distance = args[0]["distance"]
            if (odometer.data.isKilometers) {distance *= odometer.data.conversionFactor}
            const decimals = (distance % 1).toFixed(2);
            decimal_el.innerHTML = `<br>${decimals.substring(1)}`;
            return Reflect.apply(target, thisArg, args);
        },
    });
    add_checkbox("Show decimals in distance", "decimal_units", async (value) => {
        if (value) {
            units_el.classList.add("mmt-miles-decimal");
        } else {
            units_el.classList.remove("mmt-miles-decimal");
        }
    });

    // Opacities
    // Map opacity
    mapContainerEl.style.opacity = settings.map_opacity;
    add_slider("Collapsed map opacity", "map_opacity", (value) => {
        mapContainerEl.style.opacity = value;
    }, [0, 1, 0.05]);
    mapContainerEl.style.setProperty('--map-opacity-expanded', settings.map_opacity_expanded);
    add_slider("Expanded map opacity", "map_opacity_expanded", (value) => {
        mapContainerEl.style.setProperty('--map-opacity-expanded', value);
    }, [0, 1, 0.05]);
    //Marker opacity
    marker_el.style.setProperty('--marker-opacity', settings.marker_opacity);
    // Route opacity
    add_slider("Route opacity", "route_opacity", (value) => {
        ml_map.setPaintProperty("route", "line-opacity", parseFloat(value));
        ml_map.setPaintProperty("old-route-layer", "line-opacity", parseFloat(value));
    }, [0, 1, 0.05]);

    // Set the variables for map resizing if not undefined
    function setMiniMapSize({ width, height, expanded_width, expanded_height }) {
        miniMapEl.style.setProperty('--map-width', width ? `${Math.min(Math.max(0, width), 100)}vw` : "");
        miniMapEl.style.setProperty('--map-height', height ? `${Math.min(Math.max(0, height), 100)}vh` : "");
        miniMapEl.style.setProperty('--map-width-expanded', expanded_width ? `${Math.min(Math.max(0, expanded_width), 100)}vw` : "");
        miniMapEl.style.setProperty('--map-height-expanded', expanded_height ? `${Math.min(Math.max(0, expanded_height), 100)}vh` : "");
    }

    // Handle the dragging logic for resizing
    let isClicked = false; // Clicked determines if we should be listening to mousemove
    let isResizing = false; // Resizing determines if the expanded state should be switched
    let lastX, lastY;

    expandButtonEl.addEventListener('mousedown', (e) => {
        isClicked = true;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isClicked) return;
        if (e.buttons == 0) {
            isClicked = false;
            isResizing = false;
            return;
        }

        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;

        // Set the resizing flag if we moved
        // The call to switch expanded state will then not be sent
        isResizing = true;

        const currentSizePx = {
            width: miniMapEl.offsetWidth,
            height: miniMapEl.offsetHeight
        };

        const e_mod = mapContainerEl.classList.contains("expanded") ? "expanded_" : "";
        settings.map_size[e_mod+"width"] = (currentSizePx.width + deltaX) / window.innerWidth * 100
        settings.map_size[e_mod+"height"] = (currentSizePx.height - deltaY) / window.innerHeight * 100

        setMiniMapSize(settings.map_size);
        GM.setValues(settings);

        lastX = e.clientX;
        lastY = e.clientY;
    });

    document.addEventListener('mouseup', (e) => {
        isClicked = false;
    });

    // Override toggleExpand, which always fires on mouseup on the expand button
    map.state.toggleExpand = new Proxy(map.methods.toggleExpand, {
        apply(ogToggleExpand, thisArg, args) {
            if (isResizing) {
                isResizing = false;
                return;
            }
            isClicked = false;

            return ogToggleExpand.apply(thisArg, args);
        }
    });

    setMiniMapSize(settings.map_size);
    ml_map.resize();

    // Automatically expand the map
    if (window.innerWidth > 900 && settings.expand_map) {
        map.state.isExpanded = true;
    }
    // Perform some actions once the map loads
    ml_map.on('load', () => {
        // Redraw when loaded, as map.state.isExpanded is not immediate
        ml_map.resize();
        ml_map.setPaintProperty("route", "line-opacity", parseFloat(settings.route_opacity));
        // Add decimals to odometer here, otherwise style not applied when imperial units used
        if (settings.decimal_units) {
            units_el.classList.add("mmt-miles-decimal");
        }
    });
    // Set the old route opacity once it's added
    const old_route_subscription = ml_map.on('data', "old-route-layer", (e) => {
        if (e.sourceID = "old-route-layer") {
            ml_map.setPaintProperty("old-route-layer", "line-opacity", parseFloat(settings.route_opacity));
            old_route_subscription.unsubscribe();
        }
    })

    // Marker colour GUI setting
    {
        let label = document.createElement("label");

        let input = document.createElement("input");
        input.type = "color";
        input.value = settings.marker_color;
        label.appendChild(input);

        let text = document.createElement("span");
        text.innerText = " Added marker colour (right-click map to add marker)";
        label.appendChild(text);

        input.onchange = () => {
            settings.marker_color = input.value;
            GM.setValues(settings);
        }

        irf_settings.container.appendChild(label);
        irf_settings.container.appendChild(document.createElement("br"));
        irf_settings.container.appendChild(document.createElement("br"));
    }

    // Correct car marker offset
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

    // Custom car marker
    const custom_car = document.createElement("img");
    custom_car.src = settings.car_marker_url;
    custom_car.style.maxWidth = `${settings.car_marker_scale}%`;
    custom_car.style.maxHeight = `${settings.car_marker_scale}%`;
    custom_car.style.rotate = `${settings.car_marker_rotation}deg`;
    custom_car.style.display = settings.car_marker_custom ? "block" : "none";
    marker_el.appendChild(custom_car);

    // Correct the marker rotation when the car moves
    const changeStop = (await IRF.vdom.container).methods.changeStop;
    (await IRF.vdom.container).state.changeStop = new Proxy(changeStop, {
		apply: (target, thisArg, args) => {
			const returnValue = Reflect.apply(target, thisArg, args);
            let x_flip = settings.car_marker_flip ? "-1" : "1";
            if (settings.car_marker_flip_x && args[3] > 180) {
                custom_car.style.transform = `scale(${x_flip}, -1)`;
            } else {
                custom_car.style.transform = `scale(${x_flip}, 1)`;
            }
            return returnValue;
		},
	});

    // Custom car marker settings
    irf_settings.container.appendChild(document.createElement("hr"));
    irf_settings.container.appendChild(document.createElement("br"));

    add_slider("Car marker opacity", "marker_opacity", (value) => {
        marker_el.style.setProperty('--marker-opacity', value);
    }, [0, 1, 0.05]);

    add_checkbox("Custom car marker", "car_marker_custom", (show) => {
        custom_car.style.display = show ? "block" : "none";
        marker_el.style.backgroundImage = default_marker_svg();
    })

    // URL for car marker
    {
        let label = document.createElement("label");

        let text = document.createElement("span");
        text.innerHTML = " Custom car marker image URL<br> (host on <a href='https://catbox.moe' target='_blank'>catbox.moe</a>):";
        label.appendChild(text);
        label.appendChild(document.createElement("br"));

        var box = document.createElement("input");
        box.value = settings.car_marker_url;
        box.style.width = "100%";
        label.appendChild(box);

        irf_settings.container.appendChild(label);
        irf_settings.container.appendChild(document.createElement("br"));
        irf_settings.container.appendChild(document.createElement("br"));

        box.oninput = () => {
            settings.car_marker_url = box.value;
            GM.setValues(settings);
            custom_car.src = settings.car_marker_url;
        }
    }
    add_slider("Car marker size (px)", "car_marker_size", (value) => {
        marker_el.style.width = `${value}px`;
        marker_el.style.height = `${value}px`;
    }, [20, 100, 1]);
    add_slider("Custom car marker scale (%)", "car_marker_scale", (value) => {
        custom_car.style.maxWidth = `${value}%`;
        custom_car.style.maxHeight = `${value}%`;
    }, [0, 100, 1]);
    add_slider("Custom car marker rotation (deg)", "car_marker_rotation", (value) => {
        custom_car.style.rotate = `${value}deg`;
    }, [0, 360, 5]);

    add_checkbox("Flip image", "car_marker_flip")
    add_checkbox("Flip image when going left", "car_marker_flip_x")

    const attribution = document.createElement("span");
    attribution.innerHTML = "Default white van picture:<br><a href='https://www.vecteezy.com/free-png/2d-delivery-truck-top-view' target='_blank'>2d Delivery Truck Top View PNGs by Vecteezy</a> - "
    irf_settings.container.appendChild(attribution);
    const restore_van = document.createElement("span");
    restore_van.innerHTML = "Restore"
    restore_van.onclick = () => {
        box.value = "https://files.catbox.moe/a55qk5.png";
        box.dispatchEvent(new Event("input"));
    }
    restore_van.style.textDecoration = "underline";
    restore_van.style.color = "#aaa";
    restore_van.style.cursor = "pointer";
    irf_settings.container.appendChild(restore_van);
    irf_settings.container.appendChild(document.createElement("br"));
    irf_settings.container.appendChild(document.createElement("br"));

    // Map side menu settings
    irf_settings.container.appendChild(document.createElement("hr"));
    irf_settings.container.appendChild(document.createElement("br"));
    const menu_s_label = document.createElement("span");
    menu_s_label.innerText = "Minimap side buttons:";
    irf_settings.container.appendChild(menu_s_label);
    irf_settings.container.appendChild(document.createElement("br"));
    irf_settings.container.appendChild(document.createElement("br"));

    // Compass first
    // Add a compass
    const compass = new maplibre.NavigationControl({
        visualizePitch: true,
        visualizeRoll: true,
        showCompass: true,
        showZoom: false
    })
    ml_map.addControl(compass, "bottom-left");
    compass._container.style.display = settings.side_compass ? "block" : "none";
    add_checkbox("Show compass", "side_compass", (show) => {
        compass._container.style.display = show ? "block" : "none";
    })

    // Then all the other buttons
    irf_settings.container.appendChild(control._s_cont);

    // Measure distances
    const trash_svg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5" class="size-6" viewBox="-6 -6 36 36"><path stroke-linecap="round" stroke-linejoin="round" d="m14.7 9-.3 9m-4.8 0-.3-9m10-3.2 1 .2m-1-.2-1.1 13.9a2.3 2.3 0 0 1-2.3 2H8.1a2.3 2.3 0 0 1-2.3-2l-1-14m14.4 0a48.1 48.1 0 0 0-3.4-.3M3.8 6l1-.2m0 0a48.1 48.1 0 0 1 3.5-.4m7.5 0v-1c0-1.1-1-2-2.1-2.1a52 52 0 0 0-3.4 0c-1.1 0-2 1-2 2.2v.9m7.5 0a48.7 48.7 0 0 0-7.5 0"/></svg>';
    class DistanceControl {
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

        onAdd(map) {
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

    // Code for measuring distance is heavily rewritten into an object
    // https://maplibre.org/maplibre-gl-js/docs/examples/measure/

    // This object should handle most of the abstract measuring functions
    class Measure {
        // GeoJSON object to hold our measurement features - points and a line
        geojson_points = {
            'type': 'FeatureCollection',
            'features': []
        };
        geojson_line = {
            'type': 'FeatureCollection',
            'features': []
        };

        // Feature to draw the line between points
        linestring = {
            'type': 'Feature',
            'geometry': {
                'type': 'LineString',
                'coordinates': []
            }
        };

        // Compute and display the distance determined by the line
        setDistance() {
            const unit = odometer.data.isKilometers ? "km" : "mi";
            const conversion = odometer.data.isKilometers ? odometer.data.conversionFactor : 1;
            const distance = turf.length(this.linestring) / conversion;
            distance_control.dist_cont.innerText = `${distance.toFixed(3)} ${unit}`;
        }

        // Update the line based on the points
        _recomputeLine() {
            this.linestring.geometry.coordinates = this.geojson_points.features.map(
                (point) => {
                    return point.geometry.coordinates;
                }
            );
            this.geojson_line.features = [this.linestring];
            ml_map.getSource('geojson_line').setData(this.geojson_line);
        }

        // Update the points data on the map (and the distance based on that)
        _updatePoints() {
            this._recomputeLine();
            ml_map.getSource('geojson_points').setData(this.geojson_points);
            this.setDistance();
        }

        // Remove all points
        clearPoints() {
            this.geojson_points.features = [];
            this._updatePoints();
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
    }
    measure = new Measure();

    ml_map.on('load', () => {
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
                'line-color': '#0006',
                'line-width': 2.5
            },
        });
        ml_map.addLayer({
            id: 'measure-points',
            type: 'circle',
            source: 'geojson_points',
            paint: {
                'circle-radius': 5,
                'circle-color': '#0009'
            },
        });

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
    });


})();