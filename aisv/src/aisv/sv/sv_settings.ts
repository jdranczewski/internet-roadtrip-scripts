import { default_settings } from "../default_settings";
import { type AISVMessageEvent } from "../messaging";
import { messenger } from "./api";

export const settings = default_settings;
const storedSettings = await GM.getValues(Object.keys(settings));
Object.assign(
    settings,
    storedSettings
);

messenger.addEventListener("settingChanged", (event: AISVMessageEvent) => {
    settings[event.args.identifier] = event.args.value;
})