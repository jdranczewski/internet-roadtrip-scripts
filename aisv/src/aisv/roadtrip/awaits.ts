import * as IRF from 'internet-roadtrip-framework'

let _vcontainer;
let _voptions;

if (IRF.isInternetRoadtrip) {
    _vcontainer = await IRF.vdom.container;
    _voptions = await IRF.vdom.options;
}

export const vcontainer = _vcontainer;
export const voptions = _voptions;