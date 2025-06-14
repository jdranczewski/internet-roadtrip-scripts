// ==UserScript==
// @name        Internet Roadtrip - Remember radio volume
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/internet-roadtrip/*
// @version     0.0.1
// @author      jdranczewski
// @description Preserve the volume of the Internet Roadtrip radio
// @license     MIT
// @icon         https://neal.fun/favicons/internet-roadtrip.png
// @grant        GM.setValue
// @grant        GM.getValue
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// ==/UserScript==

// This works together with irf.d.ts to give us type hints
/**
 * Internet Roadtrip Framework
 * @typedef {typeof import('internet-roadtrip-framework')} IRF
 */

(async function() {
    // Get the radio object and stored options
    const radio = await IRF.vdom.radio;
    const volume = await GM.getValue("radio_volume_angle");

    // Set the volume to the stored value
    if (volume) {
        radio.methods.updateVolumeFromAngle(volume);
    }

    // Override the volume setting method to store the angle
    radio.state.updateVolumeFromAngle = new Proxy(radio.methods.updateVolumeFromAngle, {
        apply(og_method, thisArg, args) {
            GM.setValue("radio_volume_angle", args[0])
            return og_method.apply(thisArg, args);
        }
    });

    
})();