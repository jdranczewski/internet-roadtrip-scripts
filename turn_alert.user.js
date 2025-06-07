// ==UserScript==
// @name        Internet Roadtrip Turn Alert
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/internet-roadtrip/*
// @version     0.1.2
// @author      jdranczewski
// @description Play sound when turn options appear after a long stretch of straight road.
// @license     MIT
// @icon         https://neal.fun/favicons/internet-roadtrip.png
// @grant        GM.setValues
// @grant        GM.getValues
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// ==/UserScript==

(async function() {
    // Settings
    const settings = {
        "minutes": 5,
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

    // Override the setter for the number of available options
    // Get the original setter
    const { set: currentOptionsSetter } = Object.getOwnPropertyDescriptor((await IRF.vdom.container).state, 'currentOptions');
    // Override the setter
    Object.defineProperty((await IRF.vdom.container).state, 'currentOptions', {
        set(currentOptions) {
            // Set the units on the scale bar
            if (currentOptions.length == 1) {
                straight_streak += 1;
            } else {
                // console.log("Not straight!");
                if (straight_streak > settings.minutes*12) {
                    // console.log("Playing sound...")
                    howl.play();
                }
                straight_streak = 0;
            }
            // console.log("Straight for:", straight_streak);
            return currentOptionsSetter.call(this, currentOptions);
        },
        configurable: true,
        enumerable: true,
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