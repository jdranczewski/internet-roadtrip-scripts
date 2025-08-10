import * as IRF from 'internet-roadtrip-framework'
import { settings, panel } from './settings/settings'

const vmap = await IRF.vdom.map;
const ml_map = vmap.data.map;

// Add layers once the map is ready
ml_map.once("load", () => {
    ml_map.addSource('sv', {
        type: 'raster',
        tiles: [
            'https://mts.googleapis.com/vt?pb=%211m4%211m3%211i{z}%212i{x}%213i{y}%212m8%211e2%212ssvv%214m2%211scc%212s*211m3*211e2*212b1*213e2*212b1*214b1%214m2%211ssvl%212s*212b1%213m11%212sen%213sUS%2112m4%211e68%212m2%211sset%212sRoadmap%2112m3%211e37%212m1%211ssmartmaps%215m1%215f2'],
        tileSize: 256
    });
    ml_map.addSource('ugc_sv', {
        type: 'raster',
        tiles: [
            'https://mts.googleapis.com/vt?pb=%211m4%211m3%211i{z}%212i{x}%213i{y}%212m8%211e2%212ssvv%214m2%211scc%212s%2A211m3%2A211e3%2A212b1%2A213e2%2A211m3%2A211e10%2A212b1%2A213e2%2A212b1%2A214b1%214m2%211ssvl%212s%2A212b1%213m16%212sen%213sUS%2112m4%211e68%212m2%211sset%212sRoadmap%2112m3%211e37%212m1%211ssmartmaps%2112m4%211e26%212m2%211sstyles%212ss.e%7Cp.c%3A%23ff0000%2Cs.e%3Ag.f%7Cp.c%3A%23bd5f1b%2Cs.e%3Ag.s%7Cp.c%3A%23f7ca9e%2C%215m1%215f2%0A'
        ],
        tileSize: 256
    });
    ml_map.addLayer(
        {
            id: 'sv-tiles',
            type: 'raster',
            source: 'sv',
            minzoom: 0,
            maxzoom: 22,
            layout: {
                visibility: settings.coverage ? "visible" : "none",
            },
            paint: {
                "raster-opacity": parseFloat(settings.coverage_opacity)
            }
        }, "route"
    );
    ml_map.addLayer(
        {
            id: 'svugc-tiles',
            type: 'raster',
            source: 'ugc_sv',
            minzoom: 0,
            maxzoom: 22,
            layout: {
                visibility: settings.coverage ? "visible" : "none",
            },
            paint: {
                "raster-opacity": parseFloat(settings.coverage_opacity)
            }
        }, "route"
    );

    // Move the layers below some others that I would like on top
    ml_map.moveLayer("route", "boundary_3");
    ml_map.moveLayer("svugc-tiles", "route");
    ml_map.moveLayer("sv-tiles", "svugc-tiles");
})

// Settings
const section = panel.add_section("SV coverage", `Include official and unofficial SV coverage
    on the map. Official lines are shown in blue, unofficial lines are shown in orange.
    You may see a brown-ish colour where the two overlap. Photospheres are shown as red circles.`)

section.add_checkbox("Show coverage", "coverage", (value) => {
    ["svugc-tiles", "sv-tiles"].forEach((kind) => {
        ml_map.setLayoutProperty(
            kind, "visibility",
            settings.coverage ? "visible" : "none"
        )
    });
})
section.add_slider("Coverage opacity", "coverage_opacity", (value) => {
    ["svugc-tiles", "sv-tiles"].forEach((kind) => {
        ml_map.setPaintProperty(kind, "raster-opacity", parseFloat(value));
    });
}, [0, 1, 0.05])