import './settings';

import { type AISVMessageEvent } from '../messaging';
import { vcontainer, vmap, voptions } from './awaits';
import { messenger } from './iframe';
import './populate_settings';

// Styles and UI
import globalCss from './style.css';
GM.addStyle(globalCss);
import './ui';
import { settings } from './settings';

// Keyboard shortcuts
document.addEventListener("keydown", (event) => {
    if (event.key == settings.pauseKey) {
        event.preventDefault();
        messenger.send("togglePaused")
    };
    if (event.key == settings.resetViewKey) {
        event.preventDefault();
        messenger.send("resetPov");
    }
});

// Heading handling and switchFrameOrder
let currentPanoramaHeading = vcontainer.data.currentHeading;
messenger.addEventListener("setHeading", (event: AISVMessageEvent) => {
    currentPanoramaHeading = event.args.heading;
    document.querySelectorAll('.option').forEach(async (option: HTMLElement, index) => {
        option.style.rotate = `${voptions.methods.getRotation(index)}deg`;
    });

    vmap.data.marker.setRotation(currentPanoramaHeading);
});
messenger.addEventListener("marco", patchHeading);
function patchHeading() {
    voptions.state.getRotation = new Proxy(voptions.methods.getRotation, {
        apply: (target, thisArg, args) => {
            // Multiplication by 1.25 offsets the vanilla game's multiplication by 0.8.
            // This way, the arrows actually point towards the road they correspond to.
            const angle = Reflect.apply(target, thisArg, args) * 1.25;
            return angle - (currentPanoramaHeading - vcontainer.data.currentHeading) % 360;
        },
    });

    vmap.state.setMarkerRotation = new Proxy(vmap.methods.setMarkerRotation, {
        apply: (target, thisArg, args) => {
            const returnValue = Reflect.apply(target, thisArg, args);
            vmap.data.marker.setRotation(currentPanoramaHeading);
            return returnValue;
        },
    });

    // Only need to do this patch once
    messenger.removeEventListener("marco", patchHeading);
}