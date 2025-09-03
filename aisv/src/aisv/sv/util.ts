export const asyncTimeout = (ms, options?) => new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    options?.abortSignal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(options?.abortSignal.reason);
    });
});

// Normalize angles to [0, 360)
export function normalizeAngle(angle: number) {
    return ((angle % 360) + 360) % 360;
}

// Shortest angular distance between two headings
export function shortestAngleDist(a: number, b: number) {
    let diff = normalizeAngle(b) - normalizeAngle(a);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return diff;
}

export function closestLinkToHeading(links: [google.maps.StreetViewLink], heading: number) {
    let best = null;
    links.forEach((link,) => {
        const diff = Math.abs(shortestAngleDist(heading, link.heading));
        if (best == null || diff < best.diff) {
            best = { link, diff };
        }
    })
    if (best && best.diff < 120) {
        return best.link
    }
}

// The conversion between zoom and fov is hardcoded into the SV embed API backend
// This is just a linear interpolation approximation of whatever function they use
const fovs = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
const zooms = [
    0.14691402,
    0.400000006,
    0.653085947,
    0.914145529,
    1.192481279,
    1.500645995,
    1.858107567,
    2.299968719,
    2.903674841,
    3.914760113,
]
export function fovToZoom(fov: number) {
    for (let i = 0; i < fovs.length - 1; i++) {
        if (fovs[i + 1] <= fov) {
            return zooms[i] + (fov - fovs[i]) / (fovs[i + 1] - fovs[i]) * (zooms[i + 1] - zooms[i])
        }
    }
}