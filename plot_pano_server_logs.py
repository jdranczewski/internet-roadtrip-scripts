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

# %%
times, lat, lng, zoom = np.genfromtxt("log.log", delimiter=",", unpack=True)
times.shape

# %%
per_sec = []
for t in np.arange(int(np.min(times)), int(np.max(times))+1, 60):
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

# %%
