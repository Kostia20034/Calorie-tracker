import uuid
import boto3
from app.core.config import settings

s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region
)

def saveFile(fileBytes: bytes, fileName: str, content_type: str):
    extention = fileName.split(".")[-1]
    key = f"{uuid.uuid4()}.{extention}"
    
    s3_client.put_object(
        Bucket = settings.aws_s3_bucket,
        Key = key,
        Body = fileBytes,
        ContentType = content_type,
    )
    return key

def getImage(key: str) -> dict:
    response = s3_client.get_object(Key=key,
                                    Bucket=settings.aws_s3_bucket,
                        )
    return {
        "bytes" : response["Body"].read(),
        "content_type": response["ContentType"],
    }
