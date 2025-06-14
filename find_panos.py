# %%
import requests
import io
import skimage.io
import skimage.measure

import matplotlib.pyplot as plt
# %%

z, x, y = 15, 10365, 11935
url = f"https://mts.googleapis.com/vt?pb=!1m4!1m3!1i{z}!2i{x}!3i{y}!2m8!1e2!2ssvv!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e10*212b1*213e2*212b1*214b1!4m2!1ssvl!2s*212b1!3m16!2sen!3sUS!12m4!1e68!2m2!1sset!2sRoadmap!12m3!1e37!2m1!1ssmartmaps!12m4!1e26!2m2!1sstyles!2ss.e:g.s|p.v:off,s.e:g.f|p.v:off!5m1!5f2"

# %%
response = requests.get(url)
image = skimage.io.imread(io.BytesIO(response.content))

# %%
fig, ax = plt.subplots(1, 3)
for i in range(3):
    ax[i].imshow(image[:, :, i])

# %%
fig, ax = plt.subplots()
ax.imshow(image[:, :, 0] > 128)
for region in skimage.measure.regionprops(skimage.measure.label(image[:, :, 0] > 128)):
    ax.scatter(*region.centroid[::-1], s=5)

# %%
n = 2**z
lon_deg = x / n * 360.0 - 180.0
lat_rad = np.arctan(np.sinh(np.pi * (1 - 2 * y / n)))
lat_deg = lat_rad * 180.0 / np.pi
# %%
