import './meta.js?userscript-metadata';
import * as IRF from 'internet-roadtrip-framework'

import globalCss from './style.css';
import './settings/settings'

GM.addStyle(globalCss);
import { control, addContext } from './controlmenu';
import './menuactions';
import './flying';
import { markers } from './markers';
import './units';
import './car';
import './resize';
import './opacity';
import './distance';
import './coverage';
// import './kml';

// Export some APIs
(unsafeWindow as any)._MMT_control = control;
(unsafeWindow as any)._MMT_addContext = addContext;
(unsafeWindow as any)._MMT_getMarkers = () => {
    return markers;
}