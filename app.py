from flask import Flask, request, jsonify, abort, send_file
from scraper import get_card
from ImageRecognition.imageRec import testModel
from flask_cors import CORS
import cv2
import numpy as np
from io import BytesIO

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])
# Define the route for the home page (the root URL '/')
@app.get('/pokemon')
def callApi():
    query = request.args.get("q")
    result = get_card([query])
    print(result)
    if result == "404 NotFound":
        abort(404)
    return jsonify(result)
@app.route('/scan-pokemon', methods = ['POST'])
def callApiFromImage():
    image_infrence = []
    npImgs = []
    images = request.files.getlist("images")
    for file in images:
        bytes = file.read()
        interpreted = np.frombuffer(bytes, dtype = np.uint8) #interperts the bytes on the img as a numpy array
        npImgs.append(cv2.imdecode(interpreted, cv2.IMREAD_COLOR))
    ids = {}
    for img in npImgs:
        infrence_results = testModel(img)
        for croppedImg, value in infrence_results.items():
            encoded_image = cv2.imencode(".jpg", croppedImg)[1]
            image_infrence[encoded_image.tobytes()] = value
    if(len(ids) == 0):
        return jsonify({"Error": "Take a clearer image"}), 400
    return send_file(
        jsonify(get_card(ids.values())),
        image_infrence
        )
# Run the app locally if this file is executed directly
if __name__ == '__main__':
    app.run(debug=True)