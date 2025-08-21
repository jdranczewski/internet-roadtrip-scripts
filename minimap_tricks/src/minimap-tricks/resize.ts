import * as IRF from 'internet-roadtrip-framework';
import { vmap } from './awaits';
import { settings, panel } from "./settings/settings";

const ml_map = vmap.data.map;
const mapContainerEl = await IRF.dom.map;
const miniMapEl = mapContainerEl.querySelector('#mini-map') as HTMLElement;
const expandButtonEl = mapContainerEl.querySelector('.expand-button') as HTMLElement;

// Automatically expand the map
if (window.innerWidth > 900 && settings.expand_map) {
    vmap.state.isExpanded = true;
}

// Set the variables for map resizing if not undefined
function setMiniMapSize({ width, height, expanded_width, expanded_height }) {
    miniMapEl.style.setProperty('--map-width', width ? `${Math.min(Math.max(0, width), 90)}vw` : "");
    miniMapEl.style.setProperty('--map-height', height ? `${Math.min(Math.max(0, height), 90)}vh` : "");
    miniMapEl.style.setProperty('--map-width-expanded', expanded_width ? `${Math.min(Math.max(0, expanded_width), 90)}vw` : "");
    miniMapEl.style.setProperty('--map-height-expanded', expanded_height ? `${Math.min(Math.max(0, expanded_height), 90)}vh` : "");
}

// Set initial map size and resize oncee the css properties are applied
setMiniMapSize(settings.map_size);
requestAnimationFrame(() => {
    ml_map.resize();
})

// Drag to resize
let isClicked: boolean = false; // Clicked determines if we should be listening to mousemove
let isResizing: boolean = false; // Resizing determines if the expanded state should be switched
let lastX: number, lastY: number;

// Start the drag
expandButtonEl.addEventListener('mousedown', (e) => {
    isClicked = true;
    lastX = e.clientX;
    lastY = e.clientY;
    e.preventDefault();
});

// Continue the drag
document.addEventListener('mousemove', (e) => {
    if (!isClicked) return;
    if (e.buttons == 0) {
        isClicked = false;
        isResizing = false;
        return;
    }

    const deltaX = e.clientX - lastX;
    const deltaY = e.clientY - lastY;

    // Set the resizing flag if we moved
    // The call to switch expanded state will then not be sent
    isResizing = true;

    const currentSizePx = {
        width: miniMapEl.offsetWidth,
        height: miniMapEl.offsetHeight
    };

    const e_mod = mapContainerEl.classList.contains("expanded") ? "expanded_" : "";
    settings.map_size[e_mod+"width"] = (currentSizePx.width + deltaX) / window.innerWidth * 100
    settings.map_size[e_mod+"height"] = (currentSizePx.height - deltaY) / window.innerHeight * 100

    setMiniMapSize(settings.map_size);
    GM.setValues(settings);

    lastX = e.clientX;
    lastY = e.clientY;
});

// End drag
document.addEventListener('mouseup', () => {
    isClicked = false;
});

// Overriding the isExpanded setter, as overriding toggleExpand doesn't seem to work
// the first time it's called. We want to prevent this variable from being flipped if
// the map is being resized (and the game will try to flip it when the mouse is released).
const { set: isExpandedSetter } = Object.getOwnPropertyDescriptor(vmap.state, 'isExpanded');
Object.defineProperty(vmap.state, 'isExpanded', {
    set(isExpanded) {
        if (isResizing) {
            isResizing = false;
            return isExpandedSetter.call(this, !isExpanded);
        }
        return isExpandedSetter.call(this, isExpanded);
    },
    configurable: true,
    enumerable: true,
});

// Settings
export const section = panel.add_section("Map size", `You can drag the "expand"
    button of the map to change its size, and you can save two different sizes this way
    - expanded and not expanded. Click the "expand" button to toggle between these.`);

section.add_button("Reset map size", () => {
    settings.map_size = {
        width: undefined,
        height: undefined,
        expanded_width: undefined,
        expanded_height: undefined
    };
    GM.setValues(settings);
    setMiniMapSize(settings.map_size);
});
section.add_checkbox("Expand the map by default", "expand_map");