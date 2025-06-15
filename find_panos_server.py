import find_panos
import time

from flask import Flask
from flask import request

app = Flask(__name__)

@app.route("/panos")
def hello_world():
    lat = float(request.args.get('lat'))
    lng = float(request.args.get('lng'))
    z = float(request.args.get('z'))
    with open("log.log", "a") as log:
        log.write(",".join(
            map(
                str,
                (time.time(), lat, lng, z)
            )
        ) + "\n")
    return find_panos.centroids_for_coordinated(lat, lng, z)