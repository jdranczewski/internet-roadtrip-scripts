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
