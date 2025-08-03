# %%
import find_panos
import matplotlib.pyplot as plt
import numpy as np
# %%
from importlib import reload
reload(find_panos)

# %%
z = 18
lat = 45.10932781927056
lng = -64.31200288861652
x, y = find_panos.tile_from_coords(lat, lng, z)
image = find_panos.get_image(x, y, z)
plt.imshow(image)
# %%
f"https://mts.googleapis.com/vt?pb=!1m4!1m3!1i{z}!2i{x}!3i{y}!2m8!1e2!2ssvv!4m2!1scc!2s*211m3*211e3*212b1*213e2*211m3*211e10*212b1*213e2*212b1*214b1!4m2!1ssvl!2s*212b1!3m16!2sen!3sUS!12m4!1e68!2m2!1sset!2sRoadmap!12m3!1e37!2m1!1ssmartmaps!12m4!1e26!2m2!1sstyles!2ss.e:g.s|p.v:off,s.e:g.f|p.v:off!5m1!5f2"

# %%
fig, ax = plt.subplots(2, 3, sharex=True, sharey=True, layout="constrained", figsize=(12, 8))
for i, c in enumerate("rgba"):
    ax[i//2, i%2].imshow(image[:, :, i])
    ax[i//2, i%2].set_title(c)
ax[0, 2].imshow(image)

# %%
# %load_ext snakeviz

# %%
# %%snakeviz
centroids = find_panos.centroids_for_coordinated(lat, lng, z)
# %% [markdown]
# # Benchmarking

# %%
b_image = image[:, :, 0] > 128
import skimage.measure
import scipy.ndimage

# %%
# %timeit skimage.measure.label(b_image)

# %%
# %timeit scipy.ndimage.label(b_image)

# %%
scipy.ndimage.label(np.zeros((10, 10)))

# %%
fig, ax = plt.subplots(1, 2)
ax[0].imshow(skimage.measure.label(b_image))
ax[1].imshow(scipy.ndimage.label(b_image)[0])

# %%
