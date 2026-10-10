// ==UserScript==
// @name        Internet Roadtrip Stop Number
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/internet-roadtrip/*
// @version     0.1.1
// @author      jdranczewski
// @description Show the stop number above the odometer.
// @license     MIT
// @grant       GM.addStyle
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// ==/UserScript==

// This works together with irf.d.ts to give us type hints
/**
 * Internet Roadtrip Framework
 * @typedef {typeof import('internet-roadtrip-framework')} IRF
 */

(async function() {
    const vcontainer = await IRF.vdom.container;
    const odometer_el = await IRF.dom.odometer;

    GM.addStyle(`
    #stopmeter-container {
        bottom: 183px;
        position: fixed;
        right: 4px;
        transform-origin: bottom right;
        z-index: 99;
        align-items: flex-end;
        background: #000810;
        border-bottom: none;
        border-radius: 8px;
            border-bottom-right-radius: 8px;
            border-bottom-left-radius: 8px;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
        box-shadow: 0 0 0 1px #333,0 5px 15px rgba(0,0,0,.7),inset 0 1px 1px hsla(0,0%,100%,.2);
        cursor: pointer;
        display: flex;
        justify-content: center;
        margin: 0 auto;
        padding: 5px;
        color: #fff;
        font-family: monospace;
        font-size: 11px;
    }
    .odometer-container:has(~ #stopmeter-container) {
        border-top-right-radius: 0 !important;
    }
    @media screen and (max-width: 900px) {
        #stopmeter-container {
            bottom: 32px;
            right: 3px;
        }
    }
    `)

    const stopmeter = document.createElement("div");
    stopmeter.id = "stopmeter-container";
    odometer_el.parentNode.insertBefore(stopmeter, odometer_el.nextSibling);

    // const stop_text = document.createElement("div");
    // stop_text.id = "stopmeter-stop-text";
    // stop_text.innerText = "stop";
    // stopmeter.appendChild(stop_text);

    const stop_number = document.createElement("div");
    stop_number.id = "stopmeter-stop-number";
    stopmeter.appendChild(stop_number);
    
    const usFormatter = new Intl.NumberFormat("en-US");
    
    vcontainer.state.updateData = new Proxy(
        vcontainer.methods.updateData, {
        apply: (target, thisArg, args) => {
            const stop = args[0]["stop"]
            stop_number.innerText = usFormatter.format(stop);
            return Reflect.apply(target, thisArg, args);
        },
    });
})();