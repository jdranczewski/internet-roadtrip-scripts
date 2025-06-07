/*
Based on https://github.com/moonlight-mod/webpackTools/blob/main/src/spacepackEverywhere.js
Adapted to fit @require statements in userscripts.

Copyright © 2023 adryd

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.*/

function getWebpackVersion(chunkObject) {
  if (chunkObject instanceof Array) {
    return "modern";
  } else {
    return "legacy";
  }
}

// Gross Hack to support both webpack 4, webpack 5
const onChunkLoaded = function (webpackRequire) {
  webpackRequire("spacepack_lite");
};
onChunkLoaded[0] = ["spacepack"];
onChunkLoaded[Symbol.iterator] = function () {
  return {
    read: false,
    next() {
      if (!this.read) {
        this.read = true;
        return { done: false, value: 0 };
      } else {
        return { done: true };
      }
    },
  };
};

function pushSpacepack(chunkObjectName) {
  const chunkObject = window[chunkObjectName];
  if (chunkObject.__spacepack_everywhere_injected) {
    return;
  }
  const version = getWebpackVersion(chunkObject);
  console.log("[wpTools] Got " + chunkObjectName + " using webpack " + version + " :)");
  switch (version) {
    case "modern":
      chunkObject.__spacepack_everywhere_injected = true;
      chunkObject.push([
          ["spacepack"],
          { spacepack: (t, e, r) => {window._wp = r.c;} },
          onChunkLoaded
      ]);
      break;
    case "legacy":
      console.log("[wpTools] Legacy is not currently supported. Please share this site to https://github.com/moonlight-mod/webpackTools/issues/1 to help with development of legacy support");
      break;
  }
}

export function spacepackEverywhere(config) {
  if (config?.ignoreSites?.includes(window.location.host)) {
    return;
  }

  for (const key of Object.getOwnPropertyNames(window)) {
    if (
      (key.includes("webpackJsonp") || key.includes("webpackChunk") || key.includes("__LOADABLE_LOADED_CHUNKS__")) &&
      !key.startsWith("spacepack") && !config?.ignoreChunkObjects?.includes(key)
    ) {
      pushSpacepack(key);
    }
  }
}