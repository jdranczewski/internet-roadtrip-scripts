import * as IRF from 'internet-roadtrip-framework';
import { type AISVMessageEvent } from "../messaging";
import { messenger } from "./iframe";

// Add a reset button
const radio = await IRF.dom.radio;
const buttons = document.createElement("div");
buttons.id = "aisv-buttons";
radio.appendChild(buttons);

const reset = document.createElement("div");
reset.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="20" height="20" viewBox="0 0 5.56 5.56"><path d="M26 13.7a1.34 1.34 0 0 1 1.45-.56 1.34 1.34 0 0 1 1 1.18 1.34 1.34 0 0 1-.76 1.34 1.34 1.34 0 0 1-1.53-.28" style="fill:none;stroke:#fff;stroke-width:.5;stroke-linecap:butt;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1;paint-order:stroke markers fill" transform="translate(-24.43 -11.67)"/><path d="M25.9 12.97v.85h.87" style="fill:none;stroke:#fff;stroke-width:.4;stroke-linecap:butt;stroke-linejoin:miter;stroke-dasharray:none;stroke-opacity:1;paint-order:stroke markers fill" transform="translate(-24.43 -11.67)"/></svg>';
reset.classList.add("odometer-container");
reset.classList.add("aisv-button");
reset.dataset["v-259ab0e2"] = "";
buttons.appendChild(reset);
reset.addEventListener("click", () => {
    messenger.send("resetPov");
})

const pause = document.createElement("div");
pause.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" width="20" height="20" viewBox="0 0 5.56 5.56"><path d="M26.06 4.29V.86M28.36 4.29V.86" style="fill:none;stroke:#fff;stroke-width:1.2;stroke-linecap:butt;stroke-linejoin:round;stroke-dasharray:none;stroke-opacity:1;paint-order:stroke markers fill" transform="translate(-24.43 .2)"/></svg>';
pause.classList.add("odometer-container");
pause.classList.add("aisv-button");
pause.dataset["v-259ab0e2"] = "";
buttons.appendChild(pause);
pause.addEventListener("click", () => {
    messenger.send("togglePaused");
})

// Add event hooks
messenger.addEventListener("setFrosted", (event: AISVMessageEvent) => {
    const element = ({
        "togglePauseBtn": pause,
        "resetPovBtn": reset
    })[event.args.thing];
    element.classList.toggle("aisv-frosted", event.args.frosted);
})
messenger.addEventListener("marco", () => {
    // Occasionally the pause button gets stuck in frosted state
    // if the frame is loaded twice, so explictly unfreeze it once
    // the SV frame says hello
    pause.classList.toggle("aisv-frosted", false);
})