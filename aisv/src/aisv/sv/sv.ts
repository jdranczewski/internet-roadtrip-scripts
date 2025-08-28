import { instance, service, messenger } from "./api";
import { AISVMessageEvent } from "../messaging";
import globalCss from './style.css';
import { handleSetPano, resetPov, toggleManualPause } from "./pano";
import { settings } from "./sv_settings";

// Send a message to the parent window to verify that it is neal.fun
messenger.send("marco");
messenger.addEventListener("polo", handleInitialResponse);
function handleInitialResponse(event: AISVMessageEvent) {
    // We are an iframe inside the Internet Roadtrip.
    // Install all of the required hooks.
    console.log("[AISV-sv] Roadtrip connection confirmed!", instance, service);
    messenger.removeEventListener("polo", handleInitialResponse);

    // Inject styles and SV instance options
    GM.addStyle(globalCss);
    instance.setOptions({
        clickToGo: false,
        disableDefaultUI: true
    });

    // Add message hooks
    messenger.addEventListener("setPano", handleSetPano);
    messenger.addEventListener("resetPov", resetPov);
    messenger.addEventListener("togglePaused", toggleManualPause);

    // Keyboard shortcuts
    document.addEventListener("keydown", (event) => {
        if (event.key === settings.pauseKey) toggleManualPause();
        if (event.key === settings.resetViewKey) resetPov();
        messenger.send("keyDown", {key: event.key});
    });

    // Let the parent frame know when the heading changes
    {
        let lastHeading = null;
        instance.addListener('pov_changed', () => {
            const heading = instance.getPov()?.heading;
            if (!heading || heading === lastHeading) {
                return;
            }
            messenger.send("setHeading", { heading });
        })
    }
}