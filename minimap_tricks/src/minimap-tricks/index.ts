import './meta.js?userscript-metadata';
import * as IRF from 'internet-roadtrip-framework'

import globalCss from './style.css';
import './settings/settings'
import './settings/main_settings'

if (IRF.isInternetRoadtrip) {
    GM_addStyle(globalCss);
}
