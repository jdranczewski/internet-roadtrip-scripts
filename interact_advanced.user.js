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
		const vcontainer = await IRF.vdom.container;

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
			const url = new URL(urlString);
			if (!iframe.src) {
				// url.searchParams.set(
				// 	"key",
				// 	"API_KEY"
				// )
				iframe.src = url.toString();
				return;
			};
			iframe.contentWindow.postMessage({
				action: "setPano",
				args: {
					pano: url.searchParams.get("pano"),
					heading: parseFloat(url.searchParams.get("heading")),
					pitch: parseFloat(url.searchParams.get("pitch")),
					fov: parseFloat(url.searchParams.get("fov")),
					currentHeading: vcontainer.data.currentHeading,
					optionsN: vcontainer.data.currentOptions.length,
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

		// Override the StreetViewPanorama function to get the embed's instance
		Promise.all([waitForOnApiLoad]).then(([onApiLoad]) => {
			const originalOnApiLoad = onApiLoad;
			unsafeWindow.onApiLoad = function(args) {
				const originalConstructor = unsafeWindow.google.maps.StreetViewPanorama;
				unsafeWindow.google.maps.StreetViewPanorama = function(container, opts) {
					const instance = new originalConstructor(container, opts);
					unsafeWindow._SVP = instance;

					const service = new unsafeWindow.google.maps.StreetViewService();
					unsafeWindow._SVS = service;

					// Send a message to the parent window to verify that it is neal.fun
					window.parent.postMessage(marco, "https://neal.fun");
					function handleInitialResponse(event) {
						if (event.origin !== "https://neal.fun") return;
						if (event.data === polo) {
							// Modify options and add additional message handling
							// if the parent responds to our initial marco
							instance.setOptions({ linksControl: false, clickToGo: false });
							handleMessages(instance, service);
							// This event listener only needs to fire once
							window.removeEventListener("message", handleInitialResponse);
						}
					}
					window.addEventListener("message", handleInitialResponse);

					return instance;
				};
				return originalOnApiLoad(args);
			};
		});

		// Handle messages from the parent window
		function handleMessages(instance, service) {
			let canonicalPov = {
				heading: undefined,
				pitch: undefined,
				fov: undefined
			}
			let internalHeading = 0;
			let prev_pano = instance.getPano();

			[
				"pano_changed", "position_changed", "pov_changed", "status_changed",
				"visible_changed", "zoom_changed", "links_changed"
			].forEach((name) => {
				instance.addListener(name, (event) => {
					console.log(name, event);
				})
			})

			window.addEventListener("message", async (event) => {
				if (event.origin !== "https://neal.fun") return;
				if (event.data.action === "setPano") {
					const args = event.data.args;
					console.debug("[AISV] Setting pano", args.pano);

					// Store the canonical values
					canonicalPov = {
						heading: args.heading,
						pitch: args.pitch,
						fov: args.fov
					}

					// Only animate the heading if it's a
					// significant change or the pano hasn't changed
					// (dead end)
					if (
						(prev_pano === args.pano)
						|| Math.abs(shortestAngleDist(
							internalHeading,
							args.heading
						)) > 20
					) {
						console.debug("[AISV] Animating angle")
						internalHeading = args.heading;
						animateHeading(
							instance, args.heading,
							async () => {
								await changePano(args);
								prev_pano = args.pano;
							}
						);
					} else {
						console.debug("[AISV] Keeping angle the same")
						await changePano(args);
						prev_pano = args.pano;
					}
				}
			});

			async function changePano(args) {
				// Do nothing if it's the same pano
				if (prev_pano && instance.getPano() !== prev_pano) console.log("[AISV] Prev pano not equal to current!", prev_pano, instance.getPano());
				if (prev_pano === args.pano) return;
				let service_pano = await service.getPanoramaById(prev_pano);
				let links = service_pano.data.links;
				console.debug("[AISV] Current links...", service_pano.data, links);

				// If the pano is linked, great, just go there
				if (instance.getLinks().some(({ pano }) => pano === args.pano)) {
					console.debug("[AISV] Pano is linked, jumping directly");
					instance.setPano(args.pano)
					return
				} else if (args.optionsN === 1) { // Also filter by angle
					// The pano is not linked. Sigh.
					// We won't get a nice animation if we jump straight into it.
					// Since there was only one option, this could have been
					// a further straight, in which case we may be able to get there
					// in a couple of jumps.
					const path = [];
					for (let i = 0; i < 5; i++) {
						let closestLink = closestLinkToHeading(links, args.currentHeading);
						console.debug("[AISV] Checking for further straights...", closestLink.pano);
						path.push(closestLink.pano);
						if (closestLink.pano == args.pano) {
							// Congrats, we've found a path!
							console.debug("[AISV] Further straight found, executing jumps", path);
							for (let pano of path) {
								await setPanoAndWait(pano)
							}
							return;
						} else {
							service_pano = await service.getPanoramaById(closestLink.pano);
							links = service_pano.data.links;
						}
					}
				}
				// The pano is not linked, and we weren't able to find a further straight
				// TODO: Let's do a simple fade animation and jump to it
				console.debug("[AISV] Pano not linked, no further straight found");
				instance.setPano(args.pano);
			}

			async function setPanoAndWait(pano) {
				return new Promise((resolve) => {
					let panoHasChanged = false;
					let linksHaveChanged = false;
					let statusHasChanged = false;
					const checkAndResolve = () => {
						if (!panoHasChanged || !linksHaveChanged || !statusHasChanged) return;
						// resolve();
						setTimeout(() => {
							resolve();
							// console.debug("[AISV] setPanoAndWait resolve", pano);
						}, 750);
					}

					const panoChangedListener = instance.addListener('pano_changed', (event) => {
						panoHasChanged = true;
						panoChangedListener.remove();
						checkAndResolve();
					})
					const linksChangedListener = instance.addListener('links_changed', (event) => {
						linksHaveChanged = true;
						linksChangedListener.remove();
						checkAndResolve();
					});
					const statusChangedListener = instance.addListener('links_changed', (event) => {
						statusHasChanged = true;
						statusChangedListener.remove();
						checkAndResolve();
					});

					console.debug("[AISV] setPanoAndWait", pano);
					instance.setPano(pano);
				})
			}

			// Utility functions

			// Normalize angles to [0, 360)
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

			function closestLinkToHeading(links, heading) {
				return links.reduce((last, link) => {
					const diff = Math.abs(shortestAngleDist(heading, link.heading));

					if (diff > 120) {
						return last;
					}

					if (last == null || diff < last.diff) {
						return { link, diff };
					} else {
						return last;
					}
				}, null)?.link;
			}

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
			function animateHeading(panorama, targetHeading, callback) {
				const startPov = panorama.getPov();
				const startTime = performance.now();
				const headingDiff = shortestAngleDist(startPov.heading, targetHeading);
				const duration = Math.max(1000 * Math.abs(headingDiff) / 180, 100);

				function step(now) {
					const elapsed = now - startTime;
					const t = Math.max(0, Math.min(elapsed / duration, 1)); // progress 0..1
					const easedT = easeInOutQuad(t);

					// Interpolate heading with shortest path
					const heading = normalizeAngle(startPov.heading + headingDiff * easedT);
					panorama.setPov({ ... panorama.getPov(), heading });

					if (t < 1) {
						requestAnimationFrame(step);
					} else {
						callback();
					}
				}
				requestAnimationFrame(step);
			}
		}
	}

})();