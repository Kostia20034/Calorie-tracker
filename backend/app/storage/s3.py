import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from app.core.config import settings

s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region,
)


def saveFile(fileBytes: bytes, fileName: str, content_type: str):
    if (
        not settings.aws_access_key_id
        or not settings.aws_secret_access_key
        or not settings.aws_s3_bucket
        or not settings.aws_region
    ):
        raise ValueError("Image storage is not configured")

    extention = fileName.split(".")[-1]
    key = f"{uuid.uuid4()}.{extention}"

    try:
        s3_client.put_object(
            Bucket=settings.aws_s3_bucket,
            Key=key,
            Body=fileBytes,
            ContentType=content_type,
        )
    except (BotoCoreError, ClientError) as exc:
        raise ValueError("Image storage is temporarily unavailable") from exc
    return key


def getImage(key: str) -> dict:
    response = s3_client.get_object(
        Key=key,
        Bucket=settings.aws_s3_bucket,
    )
    return {
        "bytes": response["Body"].read(),
        "content_type": response["ContentType"],
    }
