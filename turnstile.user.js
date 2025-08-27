// ==UserScript==
// @name        Internet Roadtrip Fix Cloudflare Turnstile
// @namespace   jdranczewski.github.io
// @match       https://neal.fun/internet-roadtrip/*
// @version     0.2.0
// @author      jdranczewski
// @description Fix Cloudflare Turnstile performance
// @license     MIT
// @grant       unsafeWindow
// @run-at      document-end
// ==/UserScript==

(async function() {
if (unsafeWindow.turnstileInterval) {
    clearInterval(unsafeWindow.turnstileInterval);
    console.log("Turnstile interval cleared immediately");
} else {
    let _turnstileInterval;
    Object.defineProperty(unsafeWindow, "turnstileInterval", {
        get() {
            return _turnstileInterval;
        },
        set(turnstileInterval) {
            _turnstileInterval = turnstileInterval;
            clearInterval(turnstileInterval);
            console.log("Turnstile interval cleared after a bit");
        },
        configurable: true,
        enumerable: true,
    });
}
})();