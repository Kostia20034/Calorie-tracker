from app.storage.s3 import saveFile

with open("app/testPictures/test_image.jpg", "rb") as f:
    file_bytes = f.read()

key = saveFile(file_bytes, "test_image.jpg", "image/jpeg")
print("Upload with key: ", key)