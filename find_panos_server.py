import find_panos
import time
import os

from flask import Flask
from flask import request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/panos")
def panos():
    lat = float(request.args.get('lat'))
    lng = float(request.args.get('lng'))
    z = float(request.args.get('z'))
    z = z if z<=22 else 22
    with open(f"logs/{os.getpid()}.log", "a") as log:
        log.write(",".join(
            map(
                str,
                (time.time(), lat, lng, z)
            )
        ) + "\n")
        try:
            return find_panos.centroids_for_coordinated(lat, lng, z)
        except Exception as e:
            log.write(f"{e}\n")
            raise e