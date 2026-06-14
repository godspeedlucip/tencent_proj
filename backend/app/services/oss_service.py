"""Alibaba Cloud OSS upload utility."""

import os
import uuid
import oss2


def _get_bucket():
    key_id = os.getenv("OSS_ACCESS_KEY_ID")
    key_secret = os.getenv("OSS_ACCESS_KEY_SECRET")
    endpoint = os.getenv("OSS_ENDPOINT")
    bucket_name = os.getenv("OSS_BUCKET")
    if not all([key_id, key_secret, endpoint, bucket_name]):
        raise RuntimeError("OSS credentials not configured (OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_ENDPOINT, OSS_BUCKET)")
    auth = oss2.Auth(key_id, key_secret)
    return oss2.Bucket(auth, endpoint, bucket_name)


def upload_file(file_content: bytes, original_filename: str, content_type: str) -> tuple[str, str]:
    """Upload a file to Alibaba Cloud OSS.

    Args:
        file_content: Raw bytes of the file.
        original_filename: Original filename (used for extension extraction).
        content_type: MIME type for the Content-Type header on OSS.

    Returns:
        Tuple of (public_url, original_filename).
    """
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    object_name = f"uploads/{uuid.uuid4()}.{ext}"
    bucket = _get_bucket()
    endpoint = os.getenv("OSS_ENDPOINT", "")
    bucket_name = os.getenv("OSS_BUCKET", "")
    try:
        bucket.put_object(object_name, file_content, headers={"Content-Type": content_type})
    except Exception as e:
        raise RuntimeError(f"OSS upload failed: {e}") from e
    url = f"https://{bucket_name}.{endpoint}/{object_name}"
    return url, original_filename
