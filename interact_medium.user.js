// ==UserScript==
// @name        Internet Roadtrip Simple Interactive Street View
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/*
// @match       https://www.google.com/maps/embed/v1/streetview*
// @version     0.2.1
// @author      jdranczewski
// @description Make the ebedded Street View in the Internet Roadtrip interactive.
// @license     MIT
// @run-at      document-end
// @grant       GM.addStyle
// @grant       unsafeWindow
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// ==/UserScript==

// This works together with irf.d.ts to give us type hints
/**
 * Internet Roadtrip Framework
 * @typedef {typeof import('internet-roadtrip-framework')} IRF
 */

/** TODO:
 * Detect iframe reloads to disable the patch and fallback on normal source setting
 * Set the URL "manually" (which should force a reload) if an inconsistency is detected
 * Set the URL every 50 stops or so, forcing a refresh
*/

(async function() {
	const marco = "are you neal.fun?";
	const polo = "yes I am neal.fun!";

	if (IRF.isInternetRoadtrip) {
		// Show both iframes for debugging
		GM.addStyle(`
		.ISV_debug {
			#pano0 {top: 0;}
			#pano1 {top: 50vh; opacity: 1 !important}
			.pano {height: 50vh !important;}
		}
		`)

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

		function patchIframe(iframe) {
			let _src_storage = "";
			console.log("Patching iframe", iframe.id);

			Object.defineProperty(iframe, "src", {
				get() {
					return _src_storage;
				},
				set(src) {
					_src_storage = src;
					// Parse the parameters out of the URL
					// and pass them into the frame
					const url = new URL(src);
					iframe.contentWindow.postMessage({
						action: "setPano",
						args: {
							pano: url.searchParams.get("pano"),
							heading: url.searchParams.get("heading"),
							pitch: url.searchParams.get("pitch"),
							fov: url.searchParams.get("fov"),
						}
					}, "https://www.google.com")
				},
				configurable: true,
				enumerable: true,
			});
		}

		// Listen and respond to messages from embeds
		window.addEventListener("message", (event) => {
			if (event.origin !== "https://www.google.com" || event.data !== marco) return;
			event.source.postMessage(polo, event.origin);
			// Patch the frames with src setters
			if (pano0.contentWindow == event.source) patchIframe(pano0);
			if (pano1.contentWindow == event.source) patchIframe(pano1);
		});

	} else {
		// We're in Street View! Set the pano options here
		// Waiting based on Netux's implementation in the Pathfinder
		const waitForOnApiLoad = new Promise((resolve) => {
			if (unsafeWindow.onApiLoad) {
				resolve(unsafeWindow.onApiLoad);
				return;
			}
			let _onApiLoad;
			Object.defineProperty(unsafeWindow, "onApiLoad", {
				get() {
					return _onApiLoad;
				},
				set(onApiLoad) {
					_onApiLoad = onApiLoad;
					resolve(onApiLoad);
				},
				configurable: true,
				enumerable: true,
			});
    	});

		Promise.all([waitForOnApiLoad]).then(([onApiLoad]) => {
			const originalOnApiLoad = onApiLoad;
			unsafeWindow.onApiLoad = function(args) {
				const originalConstructor = unsafeWindow.google.maps.StreetViewPanorama;
				unsafeWindow.google.maps.StreetViewPanorama = function(container, opts) {
					const instance = new originalConstructor(container, opts);
					unsafeWindow._SVP = instance;

					// Send a message to the parent window to verify that it is neal.fun
					window.parent.postMessage(marco, "https://neal.fun");

					// Modify options if the parent responds
					window.addEventListener("message", (event) => {
						if (event.origin !== "https://neal.fun") return;
						if (event.data === polo) {
							instance.setOptions({ linksControl: false });
							instance.setOptions({ clickToGo: false });
							console.log(instance.zoom);	
						} else if (event.data.action === "setPano") {
							console.log("Setting pano", event.data.args.pano);
							const pov = {
								heading: parseFloat(event.data.args.heading),
								pitch: parseFloat(event.data.args.pitch),
								zoom: fovToZoom(parseFloat(event.data.args.fov))
							}
							// instance.setOptions({
							// 	pano: event.data.args.pano,
							// 	pov: pov,
							// })
							instance.setPov(pov);
							instance.setPano(event.data.args.pano);
							if (JSON.stringify(instance.pov) !== JSON.stringify(pov)) {
								console.log("Discrepancy detected", instance.pov, pov);
							}
						}
					});
					return instance;
				};
				return originalOnApiLoad(args);
			};
		});

		// The conversion between zoom and fov is hardcoded into the SV embed API backend
		// This is just a linear interpolation approximation of whatever function they use
		const fovs = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
		const zooms = [
			0.14691402,
			0.400000006,
			0.653085947,
			0.914145529,
			1.192481279,
			1.500645995,
			1.858107567,
			2.299968719,
			2.903674841,
			3.914760113,
		]
		function fovToZoom(fov) {
			for (let i = 0; i < fovs.length-1; i++) {
				if (fovs[i+1] <= fov) {
					return zooms[i] + (fov - fovs[i])/(fovs[i+1]-fovs[i]) * (zooms[i+1]-zooms[i])
				}
			}
		}
	}

})();