from flask import Flask, request, jsonify
from scraper import get_card
from ImageRecognition.imageRec import testModel
from flask_cors import CORS
import cv2
import numpy as np

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])
# Define the route for the home page (the root URL '/')
@app.get('/pokemon')
def callApi():
    query = request.args.get("q")
    result = get_card([query])
    print(result)

    return jsonify(result)
@app.route('/scan-pokemon', methods = ['POST'])
def callApiFromImage():
    npImgs = []
    images = request.files.getlist("images")
    for file in images:
        bytes = file.read()
        interpreted = np.frombuffer(bytes, dtype = np.uint8)
        npImgs.append(cv2.imdecode(interpreted, cv2.IMREAD_COLOR))
    ids = {}
    for img in npImgs:
        ids[img] = testModel(img) # stores the id it extracted from an image and the image itself as a keyvalue pair for easy debugging later 
        print(img + " ID " + ids[img])
    if(len(ids) == 0):
        return jsonify({"Error": "Take a clearer image"}), 400
    return jsonify(get_card(ids.values()))
# Run the app locally if this file is executed directly
if __name__ == '__main__':
    app.run(debug=True)