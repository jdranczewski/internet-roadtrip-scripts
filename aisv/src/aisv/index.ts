import './meta.js?userscript-metadata';

import * as IRF from 'internet-roadtrip-framework'

if (IRF.isInternetRoadtrip) {
    // We're inside Roadtrip, inject Roadtrip logic
    console.log("[AISV-rt] Inside Roadtrip");
    // @print ./dist/aisv_rt.user.js
} else if (location.hash === "#aisv-frame") {
    // We're inside a Street View embed iframe, inject SV logic
    console.log("[AISV-sv] Inside Street View");
    // @print ./dist/aisv_sv.user.js
}