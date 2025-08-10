import './meta.js?userscript-metadata';

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
declare global {
    interface Window {
        _MMT_control?: typeof control;
        _MMT_addContext?: typeof addContext;
        _MMT_getMarkers?: CallableFunction;
    }
}

unsafeWindow._MMT_control = control;
unsafeWindow._MMT_addContext = addContext;
unsafeWindow._MMT_getMarkers = () => {
    return markers;
}