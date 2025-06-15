# internet-roadtrip-scripts
My userscripts and other code for modifying and investigating the [Internet Roadtrip](https://neal.fun/internet-roadtrip/).

## Setting up the Python server
I use `uv` to manage dependencies for this project, so that's what this manual will
refer to as well, but feel free to install the dependencies (see `pyproject.toml`)
however you wish. With `uv` you can clone this folder and then run the following commands:

To create a virtual environment and install dependencies:
```
uv sync
```

To run a debug Flask server:
```
uv run flask --debug --app find_panos_server run
```

To run a production gunicorn server:
```
uv run gunicorn --reload 'find_panos_server:app'
```

The file `find_panos_interactive.py` can be run with `jupytext` as a Jupyter Notebook,
showing you how to use `find_panos.py` to find pano coordinates.
