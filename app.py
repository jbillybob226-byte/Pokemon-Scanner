from quart import Quart, request, jsonify, abort
from scraper import get_card, startBrowser, shutdownBrowser
from ImageRecognition.imageRec import testModel
from quart_cors import cors
import cv2
import numpy as np
import base64
app = Quart(__name__)
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024 #32MiB limit
app.config['MAX_FORM_MEMORY_SIZE'] = 32 * 1024 * 1024 #32MiB limit for form data
cors(app, allow_origin=["http://localhost:5173"])

@app.before_serving
async def startup():
    await startBrowser()

@app.after_serving
async def shutdown():
    await shutdownBrowser()

@app.get('/pokemon')
def callApi():
    query = request.args.get("q")
    result = get_card([query])
    print(result)
    if result == "404 NotFound":
        abort(404)
    return jsonify(result)

@app.route('/scan-pokemon', methods = ['POST'])
async def callApiFromImage():
    npImgs = []
    form = await request.form
    images = form.getlist("images")
    ids = {}
    for img in images: #convert the images that come as a jpeg encoded in base64 as a string into a numpy array with each entry representing pixel color values 
        B64data = img.split(",")[1]
        image_bytes = base64.b64decode(B64data)
        interpreted_bytes = np.frombuffer(image_bytes, dtype = np.uint8)
        npimg = cv2.imdecode(interpreted_bytes, cv2.IMREAD_COLOR)
        npImgs.append(npimg)
    for img in npImgs:
        infrence_results = testModel(img)
        if(isinstance(infrence_results, str)):
            print(infrence_results)
            return jsonify(ids), 400
        print("Passed YOLO")
        for (croppedImg, collID) in infrence_results:
            encoded_image = cv2.imencode(".jpg", croppedImg)[1].tobytes()
            image_b64 = base64.b64encode(encoded_image).decode("utf-8") #use this as a key because json cannot use python bytes as a key. Convert to b64 (for space) then decode to utf8 to make it a string
            ids[image_b64] = get_card([collID]) # in the future get all the collIds and send them all at once to get_card
        print("Passed getting cards")
    if(len(ids) == 0):
        print("Ids were not extracted")
        return jsonify(ids), 400
    return jsonify(ids) 
# Run the app locally if this file is executed directly
if __name__ == '__main__':
    app.run(debug=True)