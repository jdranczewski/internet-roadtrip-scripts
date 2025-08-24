// ==UserScript==
// @name        Internet Roadtrip Advanced Interactive Street View
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/*
// @match       https://www.google.com/maps/embed/v1/streetview*
// @version     0.2.1
// @author      jdranczewski & netux
// @description Make the ebedded Street View in the Internet Roadtrip interactive.
// @license     MIT
// @grant       GM.addStyle
// @grant       unsafeWindow
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// ==/UserScript==

// This works together with irf.d.ts to give us type hints
/**
 * Internet Roadtrip Framework
 * @typedef {typeof import('internet-roadtrip-framework')} IRF
 */

(async function () {
	const marco = "are you neal.fun?";
	const polo = "yes I am neal.fun!";

	if (IRF.isInternetRoadtrip) {
		// Get some references
		const vcontainer = await IRF.vdom.container;
		const voptions = await IRF.vdom.options;

		GM.addStyle(`
			#aisv-buttons {
				position: absolute;
				left: 0;
				bottom: -1px;
				color: white;
				transform: rotate(-90deg);
				transform-origin: bottom left;
				z-index: -1;
				display: flex;

				& .aisv-button {
					width: 34px;
					margin: 0;
					position: static;
				}
				& .aisv-button:has(+ .aisv-button) {
					border-top-right-radius: 0;
				}
				& .aisv-button+.aisv-button {
					border-top-left-radius: 0;
				}
				& .aisv-button span {
					transform: rotate(-90deg);
				}

				& .aisv-button.aisv-frosted {
					opacity: 0.75;
					background: #5c89e9cc;
    				background: linear-gradient(81deg, rgb(112 204 247 / 60%) 0%, #5c89e9cc 27%, #668de1cc 46%, #5c89e9cc 58%, rgb(209 248 255 / 71%) 100%);
				}
			}
			.radio-body {
				border-bottom-left-radius: 0 !important;
			}
		`);

		// Changing this in preparation for the breaking changes in IRF 0.5.0
		// const refs = (await IRF.vdom.container).$refs;
		const pano0 = document.getElementById("pano0");
		const pano1 = document.getElementById("pano1");

		// Don't switch frame order, we'll have our own iframe
		vcontainer.state.switchFrameOrder = new Proxy(vcontainer.methods.switchFrameOrder, {
			apply: () => { },
		});

		// Add our own iframe
		const iframe = document.createElement("iframe");
		iframe.width = "100%";
		iframe.height = "100%";
		iframe.allowFullscreen = true;
		iframe.classList.add("pano");
		iframe.style.border = "0px";
		iframe.style.zIndex = -2;
		iframe.style.pointerEvents = "auto";
		iframe.dataset["v-5f07f20e"] = "";
		pano1.parentNode.insertBefore(iframe, iframe.nextSibling);

		// Add a reset button
		const radio = await IRF.dom.radio;
		const buttons = document.createElement("div");
		buttons.id = "aisv-buttons";
		radio.appendChild(buttons);

		const reset = document.createElement("div");
		reset.innerText = "↺";
		reset.classList.add("odometer-container");
		reset.classList.add("aisv-button");
		reset.dataset["v-259ab0e2"] = "";
		buttons.appendChild(reset);
		reset.addEventListener("click", () => {
			iframe.contentWindow.postMessage({
				action: "resetPov",
			}, "https://www.google.com")
		})

		const pause = document.createElement("div");
		pause.innerHTML = "<span>❚❚</span>";
		pause.classList.add("odometer-container");
		pause.classList.add("aisv-button");
		pause.dataset["v-259ab0e2"] = "";
		buttons.appendChild(pause);
		pause.addEventListener("click", () => {
			iframe.contentWindow.postMessage({
				action: "togglePaused",
			}, "https://www.google.com")
		})

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
			if (url.origin !== 'https://www.google.com') return;
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

		document.addEventListener("keydown", (event) => {
			if (event.key == "Escape") iframe.contentWindow.postMessage({
				action: "togglePaused",
			}, "https://www.google.com");
			if (event.key == " ") iframe.contentWindow.postMessage({
				action: "resetPov",
			}, "https://www.google.com");
		});

		// Listen and respond to messages from embeds
		window.addEventListener("message", (event) => {
			if (event.origin !== "https://www.google.com") return;
			if (event.data === marco) {
				event.source.postMessage(polo, event.origin);
			} else if (event.data.action === "setHeading") {
				currentPanoramaHeading = event.data.args.heading;
				document.querySelectorAll('.option').forEach(async (option, index) => {
					option.style.rotate = `${voptions.methods.getRotation(index)}deg`;
				});
			} else if (event.data.action === "setFrosted") {
				pause.classList.toggle("aisv-frosted", event.data.args.frosted);
			}
		});
		let currentPanoramaHeading = 0;
		voptions.state.getRotation = new Proxy(voptions.methods.getRotation, {
			apply: (target, thisArg, args) => {
				// Multiplication by 1.25 offsets the vanilla game's multiplication by 0.8.
				// This way, the arrows actually point towards the road they correspond to.
				const angle = Reflect.apply(target, thisArg, args) * 1.25;
				return angle - (currentPanoramaHeading - vcontainer.state.currentHeading) % 360;
			},
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
			unsafeWindow.onApiLoad = function (args) {
				const originalConstructor = unsafeWindow.google.maps.StreetViewPanorama;
				unsafeWindow.google.maps.StreetViewPanorama = function (container, opts) {
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

		class AsyncAbortSignal extends EventTarget {
			aborted = false;
			currentActionPromise;
			reason;

			async protect(callback) {
				if (this.aborted) {
					return;
				}

				const callbackResult = callback();
				this.currentActionPromise = callbackResult instanceof Promise
					? callbackResult.then(() => { /* no-op */ })
					: Promise.resolve();

				return callbackResult;
			}

			static dummy() {
				const signal = new AsyncAbortSignal();
				signal.protect = () => Promise.resolve();
				return signal;
			}
		}

		class AsyncAbortController {
			signal;

			constructor() {
				this.refresh();
			}

			async abort(reason) {
				this.signal.aborted = true;
				this.signal.reason = reason;
				this.signal.dispatchEvent(new Event('abort'));

				await this.signal.currentActionPromise;
			}

			async refresh() {
				if (this.signal != null) {
					await this.abort();
				}

				this.signal = new AsyncAbortSignal();

				return this;
			}
		}

		// Handle messages from the parent window
		function handleMessages(instance, service) {
			let canonicalPov = {
				heading: undefined,
				pitch: undefined,
				fov: undefined
			}
			let internalHeading = instance.getPov().heading;
			let prev_pano = instance.getPano();

			GM.addStyle(`
			html {background-color: #46484f;}
			body {
				transition: filter 0.3s;
				&.filtered {
					filter: blur(15px) grayscale(1) opacity(0);
				}
				&.aBitFiltered {
					filter: blur(5px) grayscale(.1) opacity(.9);
				}
				.widget-scene {
						cursor: move !important;
				}
			}
			`);

			// [
			// 	"pano_changed", "position_changed", "pov_changed", "status_changed",
			// 	"visible_changed", "zoom_changed", "links_changed"
			// ].forEach((name) => {
			// 	instance.addListener(name, (event) => {
			// 		console.log(name, event);
			// 	})
			// })

			let scheduledSetPanoMessageData = null;
			let updatesPausedManually = false;

			document.addEventListener('visibilitychange', async () => {
				if (document.hidden) {
					console.debug('[AISV] visible to hidden');
					instance.setVisible(false);
					pauseUpdates(true);
				} else {
					console.debug('[AISV] hidden to visible', { scheduledSetPanoMessageData });
					instance.setVisible(true);
					if (!updatesPausedManually) {
						pauseUpdates(false);
					}
				}
			})

			let updatesPaused = false;
			async function pauseUpdates(pause) {
				updatesPaused = pause;
				if (!updatesPaused && scheduledSetPanoMessageData) {
					await handleSetPanoMessage(scheduledSetPanoMessageData, 'instant');
					scheduledSetPanoMessageData = null;
				}
				window.parent.postMessage({
					action: "setFrosted",
					args: { frosted: updatesPaused }
				}, "https://neal.fun")
			}

			async function toggleManualPause() {
				updatesPausedManually = !updatesPausedManually;
				pauseUpdates(!updatesPaused);

				await changePanoAsyncAbortController.abort();
			}

			document.addEventListener("keydown", (event) => {
				if (event.key === "Escape") toggleManualPause();
				if (event.key === " ") resetPov();
			});

			window.addEventListener("message", async (event) => {
				if (event.origin !== "https://neal.fun") return;
				if (event.data.action === "setPano") {
					if (updatesPaused) {
						scheduledSetPanoMessageData = event.data;
					} else {
						await handleSetPanoMessage(event.data, 'smooth');
					}
				} else if (event.data.action === "resetPov") {
					resetPov();
				} else if (event.data.action === "togglePaused") {
					toggleManualPause();
				}
			});

			async function handleSetPanoMessage(messageData, mode) {
				const args = messageData.args;
				console.debug("[AISV] Setting pano", args.pano);

				// Store the canonical values
				canonicalPov = {
					heading: args.heading,
					pitch: args.pitch,
					fov: args.fov
				};

				const doInstantJump = mode === 'instant';

				// Only animate the heading if it's a
				// significant change or the pano hasn't changed
				// (dead end)
				if (
					(prev_pano === args.pano)
					|| Math.abs(shortestAngleDist(
						internalHeading,
						args.heading
					)) > 5
				) {
					console.debug("[AISV] Animating angle")
					const userHeadingOffset = shortestAngleDist(
						instance.getPov().heading, internalHeading
					);
					console.log("[AISV] userHeadingOffset", userHeadingOffset, instance.getPov().heading, internalHeading)
					internalHeading = args.heading;
					await animatePov(
						instance,
						{ heading: internalHeading - userHeadingOffset },
						1000,
						async () => {
							await changePano(args, doInstantJump);
							prev_pano = args.pano;
						}
					);
				} else {
					console.debug("[AISV] Keeping angle the same")
					await changePano(args, doInstantJump);
					prev_pano = args.pano;
				}
			}

			let changePanoAsyncAbortController = new AsyncAbortController();
			async function changePano(args, instantJump) {
				await changePanoAsyncAbortController.refresh();

				// Do nothing if it's the same pano
				if (prev_pano && instance.getPano() !== prev_pano) console.log("[AISV] Prev pano not equal to current!", prev_pano, instance.getPano());
				if (prev_pano === args.pano) return;

				let service_pano = await service.getPanoramaById(prev_pano);
				let links = service_pano.data.links;
				console.debug("[AISV] Current links...", service_pano.data, links);

				// If the pano is linked, great, just go there
				if (links.some(({ pano }) => pano === args.pano)) {
					console.debug("[AISV] Pano is linked, jumping directly");
					await changePanoAsyncAbortController.signal.protect(async () => {
						document.body.classList.toggle("aBitFiltered", true);
						await setPanoAndWait(args.pano);
						document.body.classList.toggle("aBitFiltered", false);
					});
					return;
				} else if (!instantJump && args.optionsN === 1) { // Also filter by angle
					// The pano is not linked. Sigh.
					// We won't get a nice animation if we jump straight into it.
					// Since there was only one option, this could have been
					// a further straight, in which case we may be able to get there
					// in a couple of jumps.
					const path = [];
					for (let i = 0; i < 5; i++) {
						if (changePanoAsyncAbortController.signal.aborted) {
							return;
						}

						let closestLink = closestLinkToHeading(links, args.currentHeading);
						if (!closestLink) break;
						console.debug("[AISV] Checking for further straights...", closestLink.pano);
						path.push(closestLink.pano);
						if (closestLink.pano == args.pano) {
							// Congrats, we've found a path!
							console.debug("[AISV] Further straight found, executing jumps", path);
							document.body.classList.toggle("aBitFiltered", true);
							for (let pano of path) {
								await changePanoAsyncAbortController.signal.protect(
									() => setPanoAndWait(pano)
								);
							}
							document.body.classList.toggle("aBitFiltered", false);
							return;
						} else {
							service_pano = await service.getPanoramaById(closestLink.pano);
							links = service_pano.data.links;
						}
					}
				}

				if (changePanoAsyncAbortController.signal.aborted) {
					return;
				}

				// The pano is not linked, and we weren't able to find a further straight
				console.debug("[AISV] Pano not linked, no further straight found");
				await changePanoAsyncAbortController.signal.protect(async () => {
					document.body.classList.toggle("filtered", true);
					await asyncTimeout(300);
					instance.setPano(args.pano);
					await asyncTimeout(100);
					document.body.classList.toggle("filtered", false);
				});
			}

			async function setPanoAndWait(pano) {
				return new Promise((resolve) => {
					let last_pov_changed = undefined;
					const wait_time = 250;
					function checkAndResolve() {
						if (last_pov_changed && Date.now() - last_pov_changed > wait_time) {
							console.debug("[AISV] setPanoAndWait resolved", pano);
							povChangedListener.remove();
							resolve();
						} else {
							setTimeout(checkAndResolve, 50);
						}
					}
					const povChangedListener = instance.addListener('pov_changed', () => {
						last_pov_changed = Date.now();
					});

					console.debug("[AISV] setPanoAndWait", pano);
					instance.setPano(pano);
					setTimeout(checkAndResolve, wait_time);
				})
			}

			function resetPov() {
				internalHeading = canonicalPov.heading;
				animatePov(
					instance,
					{
						heading: canonicalPov.heading,
						pitch: canonicalPov.pitch,
						zoom: fovToZoom(canonicalPov.fov),
					},
					250
				)
			}

			// Let the parent frame know when the heading changes
			{
				let lastHeading = null;
				instance.addListener('pov_changed', () => {
					const heading = instance.getPov()?.heading;

					if (!heading || heading === lastHeading) {
						return;
					}

					window.parent.postMessage({
						action: "setHeading",
						args: { heading }
					}, "https://neal.fun")
				})
			}

			// Utility functions

			const asyncTimeout = (ms, options = {}) => new Promise((resolve, reject) => {
				const { abortSignal } = options;
				const timeout = setTimeout(resolve, ms);
				abortSignal?.addEventListener('abort', () => {
					clearTimeout(timeout);
					reject(abortSignal.reason);
				});
			});

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
				for (let i = 0; i < fovs.length - 1; i++) {
					if (fovs[i + 1] <= fov) {
						return zooms[i] + (fov - fovs[i]) / (fovs[i + 1] - fovs[i]) * (zooms[i + 1] - zooms[i])
					}
				}
			}

			let animatePovAsyncAbortController = new AsyncAbortController();
			const easeInOutQuad = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
			async function animatePov(panorama, targetPov, speed, callback) {
				await animatePovAsyncAbortController.refresh()

				const startPov = panorama.getPov();
				const startTime = performance.now();
				const headingDiff = shortestAngleDist(startPov.heading, targetPov.heading);
				const duration = Math.max(speed * Math.abs(headingDiff) / 180, 100);

				function step(now) {
					if (animatePovAsyncAbortController.signal.aborted) {
						return;
					}

					const elapsed = now - startTime;
					const t = Math.max(0, Math.min(elapsed / duration, 1)); // progress 0..1
					const easedT = easeInOutQuad(t);

					const newPov = { ... startPov };

					// Interpolate heading with shortest path
					newPov.heading = normalizeAngle(startPov.heading + headingDiff * easedT);

					if (targetPov.pitch != null) {
						// Interpolate pitch linearly
						newPov.pitch = startPov.pitch + (targetPov.pitch - startPov.pitch) * easedT;
					}

					if (targetPov.zoom != null) {
						// Interpolate zoom linearly if needed
						newPov.zoom =
							startPov.zoom !== undefined && targetPov.zoom !== undefined
								? startPov.zoom + (targetPov.zoom - startPov.zoom) * easedT
								: targetPov.zoom || 0;
					}

					panorama.setPov(newPov);

					if (t < 1) {
						requestAnimationFrame(step);
					} else {
						callback?.();
					}
				}
				requestAnimationFrame(step);
			}
		}
	}

})();
