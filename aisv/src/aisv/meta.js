// ==UserScript==
// @name        Internet Roadtrip Advanced Interactive Street View
// @namespace   jdranczewski.github.io
// @description Make the embedded Internet Roadtrip Street View fully interactive.
// @match       https://neal.fun/*
// @match       https://www.google.com/maps/embed/v1/streetview*
// @icon        https://jdranczewski.dev/irt/images/aisv.png
// @version     process.env.VERSION
// @author      process.env.AUTHOR
// @require     https://cdn.jsdelivr.net/npm/internet-roadtrip-framework@0.4.1-beta
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2/dist/solid.min.js
// @grant       GM.addStyle
// @grant       unsafeWindow
// @grant       GM.getValues
// @grant       GM.setValues
// ==/UserScript==

/**
 * Code here will be ignored on compilation. So it's a good place to leave messages to developers.
 *
 * - The `@grant`s used in your source code will be added automatically by `rollup-plugin-userscript`.
 *   However you have to add explicitly those used in required resources.
 * - `process.env.AUTHOR` will be loaded from `package.json`.
 */
