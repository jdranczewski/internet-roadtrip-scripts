import * as IRF from 'internet-roadtrip-framework'
import { vcontainer } from './awaits';
import { control } from './controlmenu'

const mapContainerEl = await IRF.dom.map;

const event = new CustomEvent("toggleFullscreenMap");

// Implement toggling fullscreen mode
let getPanoUrlOverriden = false;
export let mapIsFullscreen = false;
export let changeStopArgs = undefined;
function toggleMapFullscreen(fullscreen?: boolean) {
    mapIsFullscreen = mapContainerEl.classList.toggle("fullscreen", fullscreen);
    mapContainerEl.dispatchEvent(event);
    if (mapIsFullscreen) changeStopArgs = undefined;
    if (!mapIsFullscreen && changeStopArgs && (vcontainer.data.endTime - Date.now()) > 2000) vcontainer.methods.changeStop.apply(null, changeStopArgs);
    if (!getPanoUrlOverriden){
        vcontainer.state.getPanoUrl = new Proxy(
            vcontainer.methods.getPanoUrl, {
            apply: (target, thisArg, args) => {
                if (mapIsFullscreen) return "about:blank";
                return Reflect.apply(target, thisArg, args);
            },
        });
        getPanoUrlOverriden = true;
    }
}

// Save changeStop arguments for use when exiting fullscreen
const changeStop = vcontainer.methods.changeStop;
vcontainer.state.changeStop = new Proxy(changeStop, {
    apply: (target, thisArg, args) => {
        changeStopArgs = args;
        return Reflect.apply(target, thisArg, args);
    },
});

// Add a button to the context menu
const fullscreen_icon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-6 -6 36 36" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"/></svg>`;
control.addButton(
    `data:image/svg+xml,${encodeURIComponent(fullscreen_icon)}`,
    "Fullscreen map",
    () => toggleMapFullscreen(),
    ["Side", "Map"],
    {side_visible_default: true}
)

// Add a button on mobile that lets you jump into the fullscreen map
// from the main game view
const fs_mobile = document.createElement("div");
mapContainerEl.appendChild(fs_mobile);
fs_mobile.id = "mmt-mobile-fs";
fs_mobile.classList.add("mobile-expand-button");
fs_mobile.dataset["v-89a7e684"] = "";
fs_mobile.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(fullscreen_icon)}")`;
fs_mobile.addEventListener("click", () => toggleMapFullscreen());


// Go into fullscreen if #map is the window hash
if (window.location.hash === "#map") toggleMapFullscreen(true);