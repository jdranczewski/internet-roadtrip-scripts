import * as IRF from 'internet-roadtrip-framework';
import { type AISVMessageEvent } from "../messaging";
import { messenger } from "./iframe";

// Add a reset button
const radio = await IRF.dom.radio;
const buttons = document.createElement("div");
buttons.id = "aisv-buttons";
radio.appendChild(buttons);

const reset = document.createElement("div");
reset.innerText = "↺";
reset.classList.add("odometer-container");
reset.classList.add("aisv-button");
reset.dataset["v-259ab0e2"] = "";
buttons.appendChild(reset);
reset.addEventListener("click", () => {
    messenger.send("resetPov");
})

const pause = document.createElement("div");
pause.innerHTML = "<span>❚❚</span>";
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