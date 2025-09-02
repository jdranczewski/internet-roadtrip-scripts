import { Messenger } from "../messaging";
import { settings } from "./sv_settings";

// Override clearColor to make the SV canvas background transparent.
// Override clear to preserve contents and avoid weird jumps during rendering.
const originalGetContext = HTMLCanvasElement.prototype.getContext;
let overrideCanvasClear: boolean = true;
export function setOverrideCanvasClear(value: boolean) {
    overrideCanvasClear = value;
}
HTMLCanvasElement.prototype.getContext = function(type, args) {
    if (type === 'webgl' || type === 'experimental-webgl') {
        args = Object.assign({}, args, { preserveDrawingBuffer: settings.betterFades });
        const ctx = originalGetContext.call(this, type, args);

        // Override clearColor to make the canvas always transparent
        const originalClearColor = ctx.clearColor.bind(ctx);
        ctx.clearColor = function() {};

        // Override clear to avoid the canvas blinking to nothing
        const originalClear = ctx.clear.bind(ctx);
        if (!settings.betterFades) ctx.clear = function (mask) {
            if (overrideCanvasClear) return;
            originalClear(mask);
        }
        return ctx;
    } else {
        return originalGetContext.call(this, type, args);
    }
};

// Waiting based on Netux's implementation in the Pathfinder
declare global {
    interface google {
        maps: typeof google.maps;
    }
    interface Window {
        onApiLoad?: CallableFunction;
        google?: google;
        _SVP?: google.maps.StreetViewPanorama;
        _SVS?: google.maps.StreetViewService;
    }
}
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
const waitForInstances: Promise<[
    google.maps.StreetViewPanorama,
    google.maps.StreetViewService
]> = new Promise(async (resolve) => {
    const originalOnApiLoad = await waitForOnApiLoad;
    unsafeWindow.onApiLoad = function (args) {
        const originalConstructor = unsafeWindow.google.maps.StreetViewPanorama;
        // @ts-ignore
        unsafeWindow.google.maps.StreetViewPanorama = function (container, opts) {
            const instance: google.maps.StreetViewPanorama = new originalConstructor(container, opts);
            unsafeWindow._SVP = instance;
            // Add all the event listeners for debugging
            // [
            //     "pano_changed",
            //     "keydown",
            //     "status_changed",
            //     "visible_changed",
            //     "resize",
            //     "closeclick",
            //     "addresscontrol_changed",
            //     "clicktogo_changed",
            //     "disabledefaultui_changed",
            //     "disabledoubleclickzoom_changed",
            //     "enableclosebutton_changed",
            //     "imagedatecontrol_changed",
            //     "linkscontrol_changed",
            //     "pancontrol_changed",
            //     "scrollwheel_changed",
            //     "zoomcontrol_changed",
            //     "addresscontroloptions_changed",
            //     "pancontroloptions_changed",
            //     "zoomcontroloptions_changed",
            //     "panoprovider_changed",
            //     "pov_changed",
            //     "shouldUseRTLControlsChange",
            //     "motiontrackingcontroloptions_changed"
            // ].forEach((name) => {
            //     instance.addListener(name, (event) => {
            //         console.debug(name, event);
            //     })
            // })

            const service = new unsafeWindow.google.maps.StreetViewService();
            unsafeWindow._SVS = service;

            resolve([instance, service]);
            return instance;
        };
        // @ts-ignore
        return originalOnApiLoad(args);
    };
});

export const [instance, service] = await waitForInstances;
export const messenger = new Messenger(window.parent, "https://neal.fun");