// ==UserScript==
// @name        Internet Roadtrip Simple Interactive Street View
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/*
// @version     0.1.3
// @author      jdranczewski
// @description Make the mebedded Street View in the Internet Roadtrip somewhat interactive.
// @license     MIT
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// ==/UserScript==

(async function() {
	// Get some references
	const switchFrameOrder = (await IRF.vdom.container).methods.switchFrameOrder;
	// Changing this in preparation for the breaking changes in IRF 0.5.0
	// const refs = (await IRF.vdom.container).$refs;
	const pano0 = document.getElementById("pano0");
	const pano1 = document.getElementById("pano1");

	// Execute code AFTER a vue method executes
	(await IRF.vdom.container).state.switchFrameOrder = new Proxy(switchFrameOrder, {
		apply: (target, thisArg, args) => {
			const returnValue = Reflect.apply(target, thisArg, args);
			// Change the pointer events on the pano that's at the front
			if (1 === thisArg.currFrame) {
				pano1.style.pointerEvents = "auto"
			} else {
				pano1.style.pointerEvents = "none";
			}
			return returnValue;
		},
	});

	// Always enable pointer events for the pano that's at the back
	pano0.style.pointerEvents = "auto"

})();