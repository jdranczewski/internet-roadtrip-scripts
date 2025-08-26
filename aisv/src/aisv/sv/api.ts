import { Messenger } from "../messaging";

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