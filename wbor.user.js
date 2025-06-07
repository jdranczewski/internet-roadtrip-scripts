// ==UserScript==
// @name        Internet Roadtrip WBOR override
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/*
// @version     0.1.0
// @author      jdranczewski
// @description Replace the Internet Roadtrip radio with WBOR
// @license     MIT
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.3.2-beta
// ==/UserScript==

(async function() {
    // Get some references
    const updateData = (await IRF.vdom.container).methods.updateData;

    // Override the updateData method
    (await IRF.vdom.container).state.updateData = new Proxy(updateData, {
      apply: (target, thisArg, args) => {
        // Override the station in the data dictionary, stored as args[0] here
        args[0]["station"] = {
            name: "WBOR",
            url: "https://listen.wbor.org/",
            distance: 0
        }
        // Call the original updateData method
        return Reflect.apply(target, thisArg, args);
      },
    });

})();