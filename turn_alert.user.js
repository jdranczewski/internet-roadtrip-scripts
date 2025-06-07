// ==UserScript==
// @name        Internet Roadtrip Turn Alert
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/internet-roadtrip/*
// @version     0.2.0
// @author      jdranczewski
// @description Play sound when turn options appear after a long stretch of straight road.
// @license     MIT
// @icon         https://neal.fun/favicons/internet-roadtrip.png
// @grant        GM.setValues
// @grant        GM.getValues
// @grant        GM.addStyle
// @grant        unsafeWindow
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// ==/UserScript==

// This works together with irf.d.ts to give us type hints
/**
 * Internet Roadtrip Framework
 * @typedef {typeof import('internet-roadtrip-framework')} IRF
 */

(async function() {
    // Styles
    GM.addStyle(`
    #ta-alert-box {
        position: fixed;
        pointer-events: none;
        width: 100%;
        height: 100%;
        background-color: #00000036;
        z-index: 1000;
        transition: opacity 3s;
        opacity: 0;
        background-image: url("https://files.catbox.moe/l0mcvt.png");
        background-repeat: no-repeat;
        background-position: center;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    #ta-alert-box span {
        color: white;
        font-weight: bold;
        text-shadow: 1px 1px 2px #000000;
        font-size: 23px;
        transform: translate(0px, 50px);
    }

    #ta-alert-box.ta-alert-show {
        opacity: 1 !important;
        transition: opacity .5s;
    }
    `)
    // References
    const v_container = await IRF.vdom.container;
    const v_map = await IRF.vdom.map;
    
    // Settings
    const settings = {
        "turn": true,
        "minutes": 5,
        "marker": true,
        "distance": 500,
        "visual": true,
        "playsound": true,
        "sound": 'https://files.catbox.moe/6beir6.mp3',
        "volume": 1.0,
    }
    const storedSettings = await GM.getValues(Object.keys(settings))
    Object.assign(
        settings,
        storedSettings
    );
    await GM.setValues(settings);

    // Initial setup
    let straight_streak = 0
    let howl = new (await IRF.modules.howler).Howl({
        src: [
            settings.sound
        ],
        volume: settings.volume
    })

    const alert_box = document.createElement("div");
    alert_box.id = "ta-alert-box";
    document.body.appendChild(alert_box);
    function warn(text="") {
        if (settings.visual) {
            alert_text.innerText = text;
            alert_box.classList.toggle("ta-alert-show", true);
            setTimeout(() => {
                alert_box.classList.toggle("ta-alert-show", false);
            }, 1500);
        }
        if (settings.playsound) howl.play();
    }
    const alert_text = document.createElement("span");
    alert_box.appendChild(alert_text)

    // Override the setter for the number of available options
    // To warn if we encounter a turn suddenly
    // Get the original setter
    const { set: currentOptionsSetter } = Object.getOwnPropertyDescriptor(v_container.state, 'currentOptions');
    // Override the setter
    Object.defineProperty(v_container.state, 'currentOptions', {
        set(currentOptions) {
            // Set the units on the scale bar
            if (currentOptions.length == 1) {
                straight_streak += 1;
            } else {
                // console.log("Not straight!");
                if (straight_streak > settings.minutes*12 && settings.turn) {
                    warn("Turn now!");
                }
                straight_streak = 0;
            }
            // console.log("Straight for:", straight_streak);
            return currentOptionsSetter.call(this, currentOptions);
        },
        configurable: true,
        enumerable: true,
    });

    // Override changeStop to alert when we come close to a Marker
    const changeStop = v_container.methods.changeStop;
    const alerted = [];
    v_container.state.changeStop = new Proxy(changeStop, {
		apply: (target, thisArg, args) => {
			const returnValue = Reflect.apply(target, thisArg, args);
            const coords = args[5][0];
            const markers = unsafeWindow?._MMT_getMarkers();
            if (markers) {
                for (const [marker_id, marker] of Object.entries(markers)) {
                    if (alerted.includes(marker_id)) continue;
                    let distance = marker.getLngLat().distanceTo(v_map.data.marker.getLngLat());
                    if (distance < settings.distance && settings.marker) {
                        alerted.push(marker_id);
                        warn("Marker ahead!");
                    }
                }
            }
            return returnValue;
		},
	});

    // Settings GUI
    const irf_settings = IRF.ui.panel.createTabFor(
        GM.info, {tabName: "Turn Alert"}
    );

    function add_slider(
        name, identifier, callback=undefined,
        slider_bits=(1, 17, .5)
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
    add_slider("Time going straight before alerting (minutes, approx.)", "minutes", undefined, [1, 60, 1]);
    add_slider("Volume", "volume", (value) => {
        howl.volume(value);
    }, [0, 1, 0.05]);

    // Set sound text box
    {
        let label = document.createElement("label");

        let text = document.createElement("span");
        text.innerHTML = " Sound file URL (host on <a href='https://catbox.moe' target='_blank'>catbox.moe</a>):";
        label.appendChild(text);
        label.appendChild(document.createElement("br"));

        let box = document.createElement("input");
        box.value = settings.sound;
        box.style.width = "100%";
        label.appendChild(box);

        irf_settings.container.appendChild(label);
        irf_settings.container.appendChild(document.createElement("br"));
        irf_settings.container.appendChild(document.createElement("br"));

        button = document.createElement("button");
        button.innerText = "Test sound and save (if you hear it, it worked!)";
        button.onclick = async () => {
            howl = new (await IRF.modules.howler).Howl({
                src: [
                    box.value
                ],
                volume: settings.volume
            })
            howl.once("end", () => {
                settings["sound"] = box.value;
                GM.setValues(settings);
            })
            howl.play();
        }
        irf_settings.container.appendChild(button);
    }

})();