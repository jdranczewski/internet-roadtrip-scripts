# %%
import numpy as np
import requests
import io
import skimage.io
import skimage.measure

# %%
# Based on https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
def coords_from_tile(x, y, z):
    n = 2**z
    lon_deg = x / n * 360.0 - 180.0
    lat_rad = np.arctan(np.sinh(np.pi * (1 - 2 * y / n)))
    lat_deg = lat_rad * 180.0 / np.pi
    return lat_deg, lon_deg

def tile_from_coords(lat, lng, z):
    n = 2**z
    x = n * ((lng + 180) / 360)
    lat_rad = lat / 180 * np.pi
    y = n * (1 - (np.log(np.tan(lat_rad) + 1/np.cos(lat_rad)) / np.pi)) / 2
    return int(np.floor(x)), int(np.floor(y))

def get_image(x, y, z):
    url = f"https://mts.googleapis.com/vt?pb=!1m4!1m3!1i{z}!2i{x}!3i{y}!2m8!1e2!2ssvv!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e10*212b1*213e2*212b1*214b1!4m2!1ssvl!2s*212b1!3m16!2sen!3sUS!12m4!1e68!2m2!1sset!2sRoadmap!12m3!1e37!2m1!1ssmartmaps!12m4!1e26!2m2!1sstyles!2ss.e:g.s|p.v:off,s.e:g.f|p.v:off!5m1!5f2"
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception("The request was not successful")
    image = skimage.io.imread(io.BytesIO(response.content))
    return image

def get_centroids(image):
    regions = skimage.measure.regionprops(
        skimage.measure.label(image[:, :, 0] > 128)
    )
    return [
        [
            region.centroid[i] / image.shape[i]
            for i in (1, 0)
        ]
        for region in regions
    ]

def centroids_to_coordinates(centroids, x, y, z):
    return [
        coords_from_tile(x+c[0], y+c[1], z)
        for c in centroids
    ]

# %%

from flask import Flask
from flask import request

app = Flask(__name__)

@app.route("/panos")
def hello_world():
    z = int(request.args.get('z'))
    x, y = tile_from_coords(
        float(request.args.get('lat')),
        float(request.args.get('lng')),
        z
    )
    image = get_image(x, y, 15)
    centroids = get_centroids(image)
    return centroids_to_coordinates(centroids, x, y, z)