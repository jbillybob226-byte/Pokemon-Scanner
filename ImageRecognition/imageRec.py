from ultralytics import YOLO
import cv2
import os
from paddleocr import PaddleOCR
import numpy as np
import requests
ocr = PaddleOCR(use_textline_orientation = True, use_doc_orientation_classify=False, use_doc_unwarping=False, lang = "en",enable_mkldnn=False)
def train():
    model = YOLO("runs/detect/train-2/weights/best.pt")
    model.train(
        data = "Data/data.yaml",
        epochs = 50,
        imgsz = 640,
        batch = -1,
        device = 0
    )
def drawOcr(image, ocrResults, confThreshold):
    texts = ocrResults["rec_texts"]
    confs = ocrResults["rec_scores"]
    boxes = ocrResults["dt_polys"]
    img = image.copy()
    for text, conf, box in zip(texts, confs, boxes):
        if conf < confThreshold:#skip detections below confidence threshold
            continue
        corners = np.array(box, dtype = np.int32).reshape((-1,1,2)) #reshape the points to what cv2.polylines expests
        annotatedImage = cv2.polylines(img, [corners], isClosed = True , color = (0,0,0), thickness = 3)
    return annotatedImage

output_folder = "cropped_cards"
os.makedirs(output_folder, exist_ok=True,)
def testModel(inputImage):
    croppedImages = []
    collectorIds = []
    rawDetect = []
    # Load your trained weights instead of the generic pretrained model
    model = YOLO("runs/detect/train-2/weights/best.pt")
    results = model.predict(inputImage, save=False, conf=0.25)
    for result in results: #the reason this loops is incase the user imputes a folder of images all at once
        img = result.orig_img
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cropped_image = img[y1:y2, x1:x2]
            croppedImages.append(cropped_image)
    ocrResults = ocr.predict(croppedImages)
    for i, image in enumerate(croppedImages):
        filePath = os.path.join(output_folder, f"annotated_{i}.jpg")
        cv2.imwrite(filePath, drawOcr(image, ocrResults[i], 0.5))
        for str in ocrResults[i]["rec_texts"]:
            if str is not None and "/" in str:
                rawDetect.append(str)
                left = ""
                for i in range(str.index("/")-1, -1, -1): 
                    if str[i].isdigit():
                        left = str[i] + left#it reads the string backward so we have to build the number backward
                    else: #when we hit the end of the collector id break
                        break
                right = ""
                for i in range(str.index("/")+1, len(str), 1):
                    if str[i].isdigit():
                        right = right + str[i]
                    else: #when we hit the end of the collector id break
                        break
                if left and right: #this only runs if both of them are not empty
                  collectorIds.append(left + "/" + right)  
    print(collectorIds)
    print(rawDetect)
    return collectorIds
if __name__ == "__main__":
    #train()
    testModel()
