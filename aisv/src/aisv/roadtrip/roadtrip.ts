import { type AISVMessageEvent } from '../messaging';
import { vcontainer, voptions } from './awaits';
import { messenger } from './iframe';

// Styles and UI
import globalCss from './style.css';
GM.addStyle(globalCss);
import './ui';

// Keyboard shortcuts
document.addEventListener("keydown", (event) => {
    if (event.key == " ") {
        event.preventDefault();
        messenger.send("togglePaused")
    };
    if (event.key == "Escape") {
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
})
messenger.addEventListener("marco", patchHeading);
function patchHeading(event: AISVMessageEvent) {
    voptions.state.getRotation = new Proxy(voptions.methods.getRotation, {
        apply: (target, thisArg, args) => {
            // Multiplication by 1.25 offsets the vanilla game's multiplication by 0.8.
            // This way, the arrows actually point towards the road they correspond to.
            const angle = Reflect.apply(target, thisArg, args) * 1.25;
            return angle - (currentPanoramaHeading - vcontainer.data.currentHeading) % 360;
        },
    });

    // Only need to do this patch once
    messenger.removeEventListener("marco", patchHeading);
}