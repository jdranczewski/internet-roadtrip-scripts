import { waitForInstances } from "./api";
import { Messenger, MessageEvent } from "../messaging";

export async function setup_sv() {
    console.log("[AISV-sv] wait for instance...");
    const [instance, service] = await waitForInstances;
    console.log("[AISV-sv] instance got", instance, service);
    const messenger = new Messenger(window.parent, "https://neal.fun");
    
    // Send a message to the parent window to verify that it is neal.fun
    messenger.send("marco");
    messenger.addEventListener("polo", (event) => {
        // We are an iframe inside the Internet Roadtrip.
        // Install all of the required hooks.
        console.log("[AISV-sv] Roadtrip connection confirmed!");
        instance.setOptions({ linksControl: false, clickToGo: false });
        messenger.addEventListener("setPano", (event: MessageEvent) => {
            const pov = {// @ts-ignore
                heading: event.args.heading, // @ts-ignore
                pitch: event.args.pitch,
                zoom: 0
            }
            instance.setPov(pov);
            // @ts-ignore
            instance.setPano(event.args.pano);
        })
    });
}