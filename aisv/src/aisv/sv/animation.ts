import { animatePovAsyncAbortController } from "./aborts";
import { instance } from "./api";
import { normalizeAngle, shortestAngleDist } from "./util";

const mapDiv = document.getElementById("mapDiv");
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
        currentlyFadeTransitioning = true;
        mapDiv.classList.toggle(filterClass, true);
    }

    const result = await callback();

    if (filterClass != null) {
        mapDiv.classList.toggle(filterClass, false);
        currentlyFadeTransitioning = false;
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