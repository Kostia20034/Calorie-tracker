from app.storage.s3 import getImage

key = "4b953df2-0dc3-4690-ad7a-652c84a08f16.jpg"

response = getImage(key=key)
print("Response: ", response["content_type"])