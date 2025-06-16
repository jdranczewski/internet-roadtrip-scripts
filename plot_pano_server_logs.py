# ---
# jupyter:
#   jupytext:
#     formats: py:percent
#     text_representation:
#       extension: .py
#       format_name: percent
#       format_version: '1.3'
#       jupytext_version: 1.16.4
#   kernelspec:
#     display_name: Python 3 (ipykernel)
#     language: python
#     name: python3
# ---

# %%
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
import pandas as pd
import geopandas
from geodatasets import get_path
from glob import glob
from tqdm import tqdm

# %% [markdown]
# # Initial tests

# %%
times, lat, lng, zoom = np.genfromtxt("log.log", delimiter=",", unpack=True)
times.shape

# %%
per_sec = []
for t in np.arange(int(np.min(times)), int(np.max(times))+60, 60):
    per_sec.append(np.sum(np.logical_and(times>t, times<t+60)))

# %%
fig = plt.figure(layout="constrained")
ax = fig.add_subplot(
        1, 2, 1,
        title="Requests per minute",
        xlabel="Minute"
)
ax.plot(per_sec)
ax = fig.add_subplot(
        1, 2, 2,
        title="Request location",
        xlabel="Longitude",
        ylabel="Latitude"
)
ax.plot(lng, lat, ".", alpha=.1)

# %% [markdown]
# # Multi-worker logs

# %%
world = geopandas.read_file(get_path("naturalearth.land"))

# %%
glob("logs/*.log")

# %%
datas = []
for fname in tqdm(glob("logs/*.log")):
    data = pd.read_csv(fname, names=["time", "lat", "lng", "zoom"], on_bad_lines="skip")
    if data["time"].dtype != np.float64:
        data = data.iloc[[i for i, x in enumerate(data["time"]) if x[0] != "T"]]
    datas.append(data.astype(float))
data = pd.concat(datas)
data.sort_values("time", inplace=True)

# %%
per_min = []
ref_times = np.arange(int(np.min(data["time"])), int(np.max(data["time"]))+60, 60)
for t in ref_times:
    per_min.append(np.sum(np.logical_and(data["time"]>t, data["time"]<t+60)))

# %%
gdata = geopandas.GeoDataFrame(
    data, geometry=geopandas.points_from_xy(data.lng, data.lat), crs="EPSG:4326"
)

# %%
fig = plt.figure(
    constrained_layout=True,
    figsize=(8, 3)
)
spec = GridSpec(
    nrows=1, ncols=2,
    figure=fig,
    width_ratios=(1.5, 2)
)
ax = fig.add_subplot(
    spec[:, 0],
    title="Requests per minute",
    xlabel="Hour (UTC)"
)
ax.plot(ref_times, per_min)
hours = np.arange((ref_times[0]//3600 + 1) * 3600, (ref_times[-1]//3600) * 3600 + 1, 3600)
ax.set_xticks(hours[1::2], ((hours/3600) % 24).astype(int)[1::2])
ax = fig.add_subplot(
    spec[:, 1],
    title="Request location",
    xlabel="Longitude",
    ylabel="Latitude"
)
world.plot(ax=ax, color="white", edgecolor="black", alpha=.1)
gdata.plot(ax=ax, color="tab:blue", alpha=.1, markersize=3)
fig.suptitle("Pano lookup requests")

# %%
fig = plt.figure()
ax = fig.add_subplot(
    1, 1, 1,
    title="Panoclick query zoom levels",
    xlabel="Zoom level",
    ylabel="Number"
)
ax.bar(*np.unique(data["zoom"], return_counts=True))
ax.set_xticks(np.arange(24))
ax.grid()

# %%
