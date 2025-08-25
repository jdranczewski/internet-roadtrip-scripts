import { vcontainer } from "./awaits";
import { Messenger } from '../messaging';

export function setup_iframe(): [HTMLIFrameElement, Messenger] {
    const pano0 = document.getElementById("pano0") as HTMLIFrameElement;
    const pano1 = document.getElementById("pano1") as HTMLIFrameElement;

    // We don't need `switchFrameOrder` since we're
    // using our own iframe, but some mods may hook into it
    // so we should still call the original once we're done
    // with a transition
    const originalSwitchFrameOrder = vcontainer.methods.switchFrameOrder;
    vcontainer.state.switchFrameOrder = new Proxy(originalSwitchFrameOrder, {
        apply: () => { },
    });

    // Add our own iframe
    const iframe = document.createElement("iframe");
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.allowFullscreen = true;
    iframe.classList.add("pano");
    iframe.style.border = "0px";
    iframe.style.zIndex = "-2";
    iframe.style.pointerEvents = "auto";
    iframe.dataset["v-5f07f20e"] = "";
    pano1.parentNode.insertBefore(iframe, iframe.nextSibling);
    const messenger = new Messenger(iframe.contentWindow, "https://www.google.com");

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

    function setPanoFromURL(urlString: string) {
        const url = new URL(urlString);
        if (!iframe.src) {
            iframe.src = url.toString();
            return;
        };
        if (url.origin !== 'https://www.google.com') return;
        console.log("[AISV-rt] Setting URL");
        messenger.send("setPano", {
            pano: url.searchParams.get("pano"),
            heading: parseFloat(url.searchParams.get("heading")),
            pitch: parseFloat(url.searchParams.get("pitch")),
            fov: parseFloat(url.searchParams.get("fov")),
            currentHeading: vcontainer.data.currentHeading,
            optionsN: vcontainer.data.currentOptions.length,
        });
    }

    return [iframe, messenger];
}