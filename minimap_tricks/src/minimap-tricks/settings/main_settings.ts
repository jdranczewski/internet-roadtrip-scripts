import * as settings from './settings'

export const panel = new settings.Panel("Minimap");
panel.add_checkbox("Auto-expand map", "expand_map");
panel.add_checkbox("Re-centre map on the car after a timeout", "timeout_centre");
panel.add_checkbox("Disable re-centring when map is fullscreen", "timeout_centre_fullscreen_disable");
panel.add_checkbox("Reset zoom with map re-centre", "reset_zoom");
panel.add_checkbox("Align map orientation with car", "align_orientation");