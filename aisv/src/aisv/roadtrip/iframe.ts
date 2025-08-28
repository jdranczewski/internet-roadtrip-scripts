import { vcontainer } from "./awaits";
import { Messenger } from '../messaging';

const pano0 = document.getElementById("pano0") as HTMLIFrameElement;
const pano1 = document.getElementById("pano1") as HTMLIFrameElement;

// We don't need `switchFrameOrder` since we're using our own iframe
const originalSwitchFrameOrder = vcontainer.methods.switchFrameOrder;
vcontainer.state.switchFrameOrder = new Proxy(originalSwitchFrameOrder, {
    apply: () => { },
});

// Add our own iframe
const iframe = document.createElement("iframe");
iframe.id = "aisv-iframe";
iframe.width = "100%";
iframe.height = "100%";
iframe.allowFullscreen = true;
iframe.classList.add("pano");
iframe.style.border = "0px";
iframe.style.zIndex = "-2";
iframe.style.pointerEvents = "auto";
iframe.dataset["v-5f07f20e"] = "";
pano1.parentNode.insertBefore(iframe, iframe.nextSibling);
export const messenger = new Messenger(iframe.contentWindow, "https://www.google.com");

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
let patchedSuccesfully = false;
function setPanoFromURL(urlString: string) {
    const url = new URL(urlString);
    if (!patchedSuccesfully) {
        url.hash = "aisv-frame";
        iframe.src = url.toString();
        return;
    };
    if (url.origin !== 'https://www.google.com') return;
    messenger.send("setPano", {
        pano: url.searchParams.get("pano"),
        heading: parseFloat(url.searchParams.get("heading")),
        pitch: parseFloat(url.searchParams.get("pitch")),
        fov: parseFloat(url.searchParams.get("fov")),
        currentHeading: vcontainer.data.currentHeading,
        optionsN: vcontainer.data.currentOptions.length,
    });
}

// Respond to confirm that we are an Internet Roadtrip frame
messenger.addEventListener("marco", () => {
    messenger.send("polo");
    patchedSuccesfully = true;
    unsafeWindow._AISV.patched = true;
})

// Expose an API
interface AISVAPI {
    messenger: Messenger;
    patched: boolean;
}
declare global {
    interface Window {
        _AISV?: AISVAPI;
    }
}
unsafeWindow._AISV = {
    messenger,
    patched: false
}