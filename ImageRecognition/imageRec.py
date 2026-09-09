from ultralytics import YOLO

def train():
    model = YOLO("runs/detect/train-2/weights/best.pt")
    results = model.train(
        data = "Data/data.yaml",
        epochs = 50,
        imgsz = 640,
        batch = -1,
        device = 0
    )
    metrics = model.val()
def test():
    # Load your trained weights instead of the generic pretrained model
    model = YOLO("runs/detect/train-2/weights/best.pt")

    # Run inference on the test set
    pred = model.predict(r"C:\Users\Joegeraldus\Downloads\emptyBinder.jpg", save=True, conf=0.25)

if __name__ == "__main__":
    #train()
    test()
