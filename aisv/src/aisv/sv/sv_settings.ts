import { default_settings } from "../default_settings";

export const settings = default_settings;
const storedSettings = await GM.getValues(Object.keys(settings));
Object.assign(
    settings,
    storedSettings
);