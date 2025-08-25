import './meta.js?userscript-metadata';

import * as IRF from 'internet-roadtrip-framework'
import { setup_roadtrip } from './roadtrip/roadtrip';
import { setup_sv } from './sv/sv';
if (IRF.isInternetRoadtrip) {
    // We're inside Roadtrip, inject Roadtrip logic
    setup_roadtrip();
} else {
    // We're inside a Street View embed iframe, inject SV logic
    setup_sv();
}