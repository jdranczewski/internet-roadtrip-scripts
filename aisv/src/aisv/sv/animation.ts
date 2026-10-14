import { type AISVMessageEvent } from "../messaging";
import { animatePovAsyncAbortController } from "./aborts";
import { instance, messenger } from "./api";
import { settings } from "./sv_settings";
import { normalizeAngle, shortestAngleDist } from "./util";

// Get the main embed element
const mapDiv = document.getElementById("mapDiv");

// Set some map styles
document.body.style.setProperty('--aisv-scale', settings.scale ? `${settings.scale}%` : "");
document.body.style.transform = settings.fill ? `scale(${100/parseFloat(settings.scale)})` : "none";
messenger.addEventListener("settingChanged", (event: AISVMessageEvent) => {
    if (event.args.identifier === "scale") {
        document.body.style.setProperty('--aisv-scale', `${event.args.value}%`);
        document.body.style.transform = settings.fill ? `scale(${100/parseFloat(event.args.value)})` : "none";
    }
    if (event.args.identifier == "fill") document.body.style.transform = event.args.value ? `scale(${100/parseFloat(settings.scale)})` : "none";
})

// Better fades with another canvas
export let copyCanvas = () => {};
let second_canvas: undefined | HTMLCanvasElement = undefined;
if ((settings.fadeSharpTransitions == "cross") || (settings.fadeSmoothTransitions == "cross")) {
    mapDiv?.classList.add("better");
    second_canvas = document.createElement("canvas");
    const ctx = second_canvas.getContext("2d");
    second_canvas.id = "second-canvas";
    mapDiv?.appendChild(second_canvas);
    copyCanvas = () => {
        const first_canvas = document.getElementsByClassName("mapsImagerySceneScene__canvas widget-scene-canvas")[0] as HTMLCanvasElement;
        if (second_canvas == undefined) return;
        second_canvas.width = first_canvas.width;
        second_canvas.style.width = first_canvas.style.width;
        second_canvas.height = first_canvas.height;
        second_canvas.style.height = first_canvas.style.height;
        ctx.drawImage(
            first_canvas,
            0, 0
        );
    }
}


let currentlyFadeTransitioning = false;
export async function withFadeTransition(
    callback: CallableFunction,
    filterClass: string
) {
    if (currentlyFadeTransitioning) {
        // Fade transition inside fade transition
        // Simply let the callback run through.
        return callback();
    }

    if (filterClass != null) {
        // Always copy the canvas if that's enabled, to serve either as a backdrop or a foreground (note the differing
        // zIndex values)
        copyCanvas();
        if (second_canvas !== undefined) second_canvas.style.zIndex = filterClass == "cross" ? "2" : "-1";
        if (filterClass !== "") {
            console.debug("[AISV-sv] Fade in", filterClass);
            currentlyFadeTransitioning = true;
            mapDiv.classList.toggle(filterClass, true);
        }
    }

    const result = await callback();

    if (filterClass != null && filterClass !== "") {
        console.debug("[AISV-sv] Fade out", filterClass);
        mapDiv.classList.toggle(filterClass, false);
        currentlyFadeTransitioning = false;
        // Give the second canvas time to fade out, and then bring it back in the background
        if (filterClass == "cross" && second_canvas !== undefined) {
            second_canvas.style.opacity = "0";
            setTimeout(() => {
                second_canvas.style.zIndex = "-1";
                second_canvas.style.opacity = "1";
            }, 550);
        }
    }

    return result;
}

export interface realPov extends google.maps.StreetViewPov {
    zoom: number;
}
interface optionalPov {
    heading: number;
    pitch?: number;
    zoom?: number;
}

const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
export async function animatePov(targetPov: optionalPov, speed: number) {
    await animatePovAsyncAbortController.refresh();

    return new Promise<void>((resolve) => {
        const startPov = instance.getPov() as realPov;
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

            instance.setPov(newPov);

            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                resolve();
            }
        }
        requestAnimationFrame(step);
    });
}