import { type AISVMessageEvent } from "../messaging";
import { changePanoAsyncAbortController } from "./aborts";
import { animatePov, withFadeTransition } from "./animation";
import { instance, messenger, service } from "./api";
import { asyncTimeout, closestLinkToHeading, fovToZoom, shortestAngleDist } from "./util";

// State
let internalHeading = instance.getPov().heading;
const originalSearchParams = (new URL(window.location.href)).searchParams;
let canonicalPov = {
    heading: parseFloat(originalSearchParams.get("heading")),
    pitch: parseFloat(originalSearchParams.get("pitch")),
    fov: parseFloat(originalSearchParams.get("fov"))
}
let prev_pano = instance.getPano();

let lastSetPanoMessageData = null;

// Handle pausing updates
let updatesPaused = false;
let updatesPausedManually = false;
async function pauseUpdates(pause, source) {
    if (!pause && lastSetPanoMessageData) {
        await handleSetPanoMessage(
            lastSetPanoMessageData,
            updatesPausedManually ? 'smooth' : 'instant'
        );
    }

    updatesPaused = pause;
    updatesPausedManually = pause && source === 'manual';

    window.parent.postMessage({
        action: "setFrosted",
        args: {
            thing: "togglePauseBtn",
            frosted: updatesPaused
        }
    }, "https://neal.fun");
}

document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
        instance.setVisible(false);
        if (!updatesPausedManually) {
            pauseUpdates(true, 'document-visibility');
        }
    } else {
        instance.setVisible(true);
        if (!updatesPausedManually) {
            pauseUpdates(false, 'document-visibility');
        }
    }
});

export async function toggleManualPause() {
    prev_pano = instance.getPano();
    pauseUpdates(!updatesPaused, 'manual');
    await changePanoAsyncAbortController.abort();
}

// Handle message events
export async function handleSetPano(event: AISVMessageEvent) {
    if (!updatesPaused) {
        await handleSetPanoMessage(event.args, 'smooth');
    }
    lastSetPanoMessageData = event.args;
}

async function handleSetPanoMessage(args, mode?) {
    console.debug("[AISV-sv] Setting pano", args.pano);

    // Store the canonical values
    canonicalPov = {
        heading: args.heading,
        pitch: args.pitch,
        fov: args.fov
    };

    const doInstantJump = mode === 'instant';
    if (
        (prev_pano === args.pano)
        || Math.abs(shortestAngleDist(
            internalHeading,
            args.heading
        )) > 5
    ) {
        // Only animate the heading if it's a
        // significant change or the pano hasn't changed
        // (dead end)
        const userHeadingOffset = shortestAngleDist(
            instance.getPov().heading, internalHeading
        );
        internalHeading = args.heading;
        await withFadeTransition(
            async () => {
                const targetHeading = internalHeading - userHeadingOffset;
                if (doInstantJump) {
                    instance.setPov({
                        ... instance.getPov(),
                        heading: targetHeading
                    })
                } else {
                    await animatePov(
                        { heading: targetHeading },
                        1000
                    );
                }

                await changePano(args, doInstantJump);
                prev_pano = args.pano;
            },
            doInstantJump
                ? "filtered"
                : null
        );
    } else {
        // Keeping angle the same
        await changePano(args, doInstantJump);
        prev_pano = args.pano;
    }
    messenger.send("switchFrameOrder");
}

// Change the pano
async function changePano(args, instantJump) {
    await changePanoAsyncAbortController.refresh();

    // Do nothing if it's the same pano
    if (prev_pano && instance.getPano() !== prev_pano) console.log("[AISV-sv] Prev pano not equal to current!", prev_pano, instance.getPano());
    if (prev_pano === args.pano) return;

    let service_pano;
    try {
        // @ts-expect-error
        service_pano = await service.getPanoramaById(prev_pano);
    } catch {
        // prev_pano may be invalid post-void
        // @ts-expect-error
        service_pano = await service.getPanoramaById(instance.getPano());
    }
    let links = service_pano.data.links;

    // If the pano is linked, great, just go there
    if (links.some(({ pano }) => pano === args.pano)) {
        console.debug("[AISV-sv] Pano is linked, jumping directly");
        await changePanoAsyncAbortController.signal.protect(async () =>
            await withFadeTransition(
                async () => await setPanoAndWait(args.pano),
                "aBitFiltered"
            )
        );
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
            path.push(closestLink.pano);
            if (closestLink.pano == args.pano) {
                // Congrats, we've found a path!
                console.debug("[AISV-sv] Further straight found, executing jumps", path);
                await withFadeTransition(async () => {
                    for (let pano of path) {
                        await changePanoAsyncAbortController.signal.protect(
                            () => setPanoAndWait(pano)
                        );
                    }
                }, "aBitFiltered");
                return;
            } else {
                // @ts-expect-error
                service_pano = await service.getPanoramaById(closestLink.pano);
                links = service_pano.data.links;
            }
        }
    }

    if (changePanoAsyncAbortController.signal.aborted) {
        return;
    }

    // The pano is not linked, and we weren't able to find a further straight
    console.debug("[AISV-sv] Pano not linked, no further straight found");
    await changePanoAsyncAbortController.signal.protect(async () =>
        await withFadeTransition(async () => {
            await asyncTimeout(220);
            instance.setPano(args.pano);
            await asyncTimeout(100);
        }, "filtered")
    );
}

async function setPanoAndWait(pano) {
    return new Promise<void>((resolve) => {
        let last_pov_changed = undefined;
        const wait_time = 250;
        function checkAndResolve() {
            if (last_pov_changed && Date.now() - last_pov_changed > wait_time) {
                povChangedListener.remove();
                resolve();
            } else {
                setTimeout(checkAndResolve, 50);
            }
        }
        const povChangedListener = instance.addListener('pov_changed', () => {
            last_pov_changed = Date.now();
        });

        instance.setPano(pano);
        setTimeout(checkAndResolve, wait_time);
    })
}

// Reset the POV to canonical
export function resetPov() {
    internalHeading = canonicalPov.heading;
    animatePov(
        {
            heading: canonicalPov.heading,
            pitch: canonicalPov.pitch,
            zoom: fovToZoom(canonicalPov.fov),
        },
        250
    );

    messenger.send("setFrosted", {
        thing: "resetPovBtn",
        frosted: true
    });
    setTimeout(() => {
        messenger.send("setFrosted", {
        thing: "resetPovBtn",
        frosted: false
    });
    }, 200);
}