// ==UserScript==
// @name        Internet Roadtrip Advanced Interactive Street View
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/*
// @match       https://www.google.com/maps/embed/v1/streetview*
// @version     0.2.1
// @author      jdranczewski
// @description Make the ebedded Street View in the Internet Roadtrip interactive.
// @license     MIT
// @run-at      document-end
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// ==/UserScript==

// This works together with irf.d.ts to give us type hints
/**
 * Internet Roadtrip Framework
 * @typedef {typeof import('internet-roadtrip-framework')} IRF
 */

(async function() {
	const marco = "are you neal.fun?";
	const polo = "yes I am neal.fun!";

	if (IRF.isInternetRoadtrip) {
		// Get some references
		const vcontainer = await IRF.vdom.container

		// Changing this in preparation for the breaking changes in IRF 0.5.0
		// const refs = (await IRF.vdom.container).$refs;
		const pano0 = document.getElementById("pano0");
		const pano1 = document.getElementById("pano1");

		// Don't switch frame order, we'll have our own iframe
		vcontainer.state.switchFrameOrder = new Proxy(vcontainer.methods.switchFrameOrder, {
			apply: () => {},
		});

		// Add our own iframe
		const iframe = document.createElement("iframe");
		iframe.width = "100%";
		iframe.height = "100%";
		iframe.allowFullscreen = true;
		iframe.classList.add("pano");
		iframe.style.border = "0px";
		iframe.style.zIndex = -1;
		iframe.style.pointerEvents = "auto";
		iframe.dataset["v-5f07f20e"] = "";
		pano1.parentNode.insertBefore(iframe, iframe.nextSibling);

		// Override the source setters on the existing iframes
		pano0.src = "about:blank";
		pano1.src = "about:blank";
		[pano0, pano1].forEach((pano) => {
			let _src_storage = "";
			Object.defineProperty(pano, "src", {
				get() {
					return _src_storage;
				},
				set(src) {
					_src_storage = src;
					setPanoFromURL(src);
				},
				configurable: true,
				enumerable: true,
			});
		});

		function setPanoFromURL(urlString) {
			if (!iframe.src) {
				iframe.src = urlString;
				return;
			};
			const url = new URL(urlString);
			iframe.contentWindow.postMessage({
				action: "setPano",
				args: {
					pano: url.searchParams.get("pano"),
					heading: url.searchParams.get("heading"),
					pitch: url.searchParams.get("pitch"),
					fov: url.searchParams.get("fov"),
				}
			}, "https://www.google.com")
		}

		// Listen and respond to messages from embeds
		window.addEventListener("message", (event) => {
			if (event.origin !== "https://www.google.com" || event.data !== marco) return;
			event.source.postMessage(polo, event.origin);
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

		const easeInOutQuad = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
		function animatePov(panorama, targetPov, midcallback) {
			const startPov = panorama.getPov();
			const startTime = performance.now();

			// Normalize angles to avoid long rotations
			function normalizeAngle(angle) {
				return ((angle % 360) + 360) % 360;
			}

			// Shortest angular distance between two headings
			function shortestAngleDist(a, b) {
				let diff = normalizeAngle(b) - normalizeAngle(a);
				if (diff > 180) diff -= 360;
				if (diff < -180) diff += 360;
				return diff;
			}
			const headingDiff = shortestAngleDist(startPov.heading, targetPov.heading);
			duration = Math.max(1000 * Math.abs(headingDiff) / 180, 100);

			function step(now) {
				const elapsed = now - startTime;
				const t = Math.max(0, Math.min(elapsed / duration, 1)); // progress 0..1
				const easedT = easeInOutQuad(t);
				if (t == 1) {
					midcallback();
				}

				// Interpolate heading with shortest path
				const heading = normalizeAngle(startPov.heading + headingDiff * easedT);

				// Interpolate pitch linearly
				const pitch = startPov.pitch + (targetPov.pitch - startPov.pitch) * easedT;

				// Interpolate zoom linearly if needed
				const zoom =
				startPov.zoom !== undefined && targetPov.zoom !== undefined
					? startPov.zoom + (targetPov.zoom - startPov.zoom) * easedT
					: targetPov.zoom || 0;

				panorama.setPov({ heading, pitch, zoom });

				// if (!calledBack && t > .5) {
				// 	calledBack = true;
				// 	midcallback();
				// 	offset = 600;
				// }

				if (t < 1) {
					requestAnimationFrame(step);
				}
			}

			requestAnimationFrame(step);
		}

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
							console.log("Setting pano");
							animatePov(instance, {
								heading: parseFloat(event.data.args.heading),
								pitch: parseFloat(event.data.args.pitch),
								zoom: fovToZoom(parseFloat(event.data.args.fov)),
							}, () => instance.setPano(event.data.args.pano));
						}
					});
					return instance;
				};
				return originalOnApiLoad(args);
			};
		});
	}

})();